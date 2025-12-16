// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title BirthdaySongs
 * @dev NFT contract for custom song orders with Lit Protocol encryption
 * 
 * Architecture:
 * - Order data: encrypted on Arweave, only creator can decrypt
 * - Song files: encrypted on Arweave, creator OR NFT holder can decrypt
 * - Payments: USDC to contract (creator withdraws)
 * - Platform fee: small ETH fee on fulfillment (covers Lit + Arweave costs)
 * 
 * Tiers:
 * - BIRTHDAY: $25 - Fun birthday song
 * - NATAL: $250 - Studio quality natal chart-inspired song
 */
contract BirthdaySongs is ERC721, Ownable {
    using Strings for uint256;
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    
    uint256 private _nextTokenId;
    
    enum SongType { BIRTHDAY, NATAL }
    
    // Prices in USDC (6 decimals)
    uint256 public birthdayPrice = 25 * 1e6;  // $25
    uint256 public natalPrice = 250 * 1e6;    // $250
    
    // Platform fee in ETH (paid by creator on fulfill)
    uint256 public platformFee = 0.000001 ether;
    address public platformWallet;
    
    struct Order {
        SongType songType;
        string orderDataUri;    // Lit-encrypted order details on Arweave
        address orderedBy;
        uint256 orderedAt;
        uint256 pricePaid;
        bool fulfilled;
        string songUri;         // Lit-encrypted song on Arweave
    }
    
    mapping(uint256 => Order) public orders;
    
    event OrderCreated(
        uint256 indexed tokenId,
        address indexed orderedBy,
        SongType songType,
        string orderDataUri,
        uint256 pricePaid
    );
    
    event OrderFulfilled(
        uint256 indexed tokenId,
        string songUri
    );
    
    event PlatformFeeUpdated(uint256 newFee);
    event PricesUpdated(uint256 birthdayPrice, uint256 natalPrice);
    
    constructor(
        address _usdc,
        address _platformWallet
    ) ERC721("Birthday Songs", "BDAY") Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev Mint a birthday song order ($25)
     * @param orderDataUri Arweave URI containing Lit-encrypted order details
     */
    function mintBirthdaySong(string calldata orderDataUri) external returns (uint256) {
        return _mintOrder(SongType.BIRTHDAY, orderDataUri, birthdayPrice);
    }
    
    /**
     * @dev Mint a natal chart song order ($250)
     * @param orderDataUri Arweave URI containing Lit-encrypted order details
     */
    function mintNatalSong(string calldata orderDataUri) external returns (uint256) {
        return _mintOrder(SongType.NATAL, orderDataUri, natalPrice);
    }
    
    function _mintOrder(
        SongType songType,
        string calldata orderDataUri,
        uint256 price
    ) internal returns (uint256) {
        require(bytes(orderDataUri).length > 0, "Order data URI required");
        
        // Collect USDC payment
        USDC.safeTransferFrom(msg.sender, address(this), price);
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        
        orders[tokenId] = Order({
            songType: songType,
            orderDataUri: orderDataUri,
            orderedBy: msg.sender,
            orderedAt: block.timestamp,
            pricePaid: price,
            fulfilled: false,
            songUri: ""
        });
        
        emit OrderCreated(tokenId, msg.sender, songType, orderDataUri, price);
        
        return tokenId;
    }
    
    /**
     * @dev Owner fulfills order with Lit-encrypted song URI
     * @notice Requires platform fee in ETH to cover infrastructure costs
     */
    function fulfillOrder(uint256 tokenId, string calldata songUri) external payable onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(!orders[tokenId].fulfilled, "Already fulfilled");
        require(bytes(songUri).length > 0, "Song URI required");
        require(msg.value >= platformFee, "Insufficient platform fee");
        
        // Pay platform fee
        if (platformFee > 0) {
            (bool sent, ) = platformWallet.call{value: msg.value}("");
            require(sent, "Platform fee transfer failed");
        }
        
        orders[tokenId].fulfilled = true;
        orders[tokenId].songUri = songUri;
        
        emit OrderFulfilled(tokenId, songUri);
    }
    
    /**
     * @dev Update platform fee (only owner for now, could be platformWallet in future)
     */
    function setPlatformFee(uint256 _platformFee) external {
        require(msg.sender == platformWallet, "Only platform can update fee");
        platformFee = _platformFee;
        emit PlatformFeeUpdated(_platformFee);
    }
    
    /**
     * @dev Update prices (in USDC with 6 decimals)
     */
    function setPrices(uint256 _birthdayPrice, uint256 _natalPrice) external onlyOwner {
        birthdayPrice = _birthdayPrice;
        natalPrice = _natalPrice;
        emit PricesUpdated(_birthdayPrice, _natalPrice);
    }
    
    /**
     * @dev Withdraw all USDC to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        USDC.safeTransfer(owner(), balance);
    }
    
    function getOrder(uint256 tokenId) external view returns (Order memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return orders[tokenId];
    }
    
    function totalOrders() external view returns (uint256) {
        return _nextTokenId;
    }
    
    function getBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }
    
    /**
     * @dev Returns token URI with on-chain SVG
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        Order memory order = orders[tokenId];
        
        string memory songTypeName = order.songType == SongType.BIRTHDAY ? "Birthday Song" : "Natal Chart Song";
        string memory emoji = order.songType == SongType.BIRTHDAY ? unicode"🎂" : unicode"✨";
        string memory status = order.fulfilled ? "Ready" : "Creating";
        string memory statusColor = order.fulfilled ? "#22c55e" : "#f59e0b";
        string memory priceStr = order.songType == SongType.BIRTHDAY ? "$25" : "$250";
        
        // Different gradient for each type
        string memory gradientStart = order.songType == SongType.BIRTHDAY ? "#60a5fa" : "#8b5cf6";
        string memory gradientEnd = order.songType == SongType.BIRTHDAY ? "#3b82f6" : "#6d28d9";
        
        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:', gradientStart, '"/>',
            '<stop offset="100%" style="stop-color:', gradientEnd, '"/>',
            '</linearGradient></defs>',
            '<rect width="400" height="400" fill="url(#bg)"/>',
            '<text x="200" y="50" font-family="Arial" font-size="20" font-weight="bold" fill="white" text-anchor="middle">', songTypeName, '</text>',
            '<text x="200" y="80" font-family="Arial" font-size="14" fill="white" opacity="0.8" text-anchor="middle">#', tokenId.toString(), ' ', unicode"•", ' ', priceStr, '</text>',
            '<circle cx="200" cy="200" r="70" fill="white" opacity="0.15"/>',
            '<text x="200" y="220" font-size="80" text-anchor="middle">', emoji, '</text>',
            '<rect x="100" y="320" width="200" height="40" rx="20" fill="', statusColor, '"/>',
            '<text x="200" y="347" font-family="Arial" font-size="16" font-weight="bold" fill="white" text-anchor="middle">', status, '</text>',
            '</svg>'
        ));
        
        string memory json = string(abi.encodePacked(
            '{"name":"', songTypeName, ' #', tokenId.toString(), '",',
            '"description":"A custom ', order.songType == SongType.BIRTHDAY ? 'birthday' : 'natal chart-inspired', ' song. ', 
            order.fulfilled ? 'Download available for NFT holder.' : 'Currently being created.', '",',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '",',
            '"attributes":[',
            '{"trait_type":"Type","value":"', songTypeName, '"},',
            '{"trait_type":"Price","value":"', priceStr, '"},',
            '{"trait_type":"Status","value":"', status, '"}'
        ));
        
        if (order.fulfilled && bytes(order.songUri).length > 0) {
            json = string(abi.encodePacked(
                json,
                ',{"trait_type":"Song","value":"Encrypted on Arweave"}'
            ));
        }
        
        json = string(abi.encodePacked(json, ']}'));
        
        return string(abi.encodePacked(
            'data:application/json;base64,',
            Base64.encode(bytes(json))
        ));
    }
}
