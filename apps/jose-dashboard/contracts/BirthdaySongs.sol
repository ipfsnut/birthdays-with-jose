// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title BirthdaySongs
 * @dev NFT contract for custom song orders
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
    
    // Limited edition supply caps
    uint256 public constant BIRTHDAY_SUPPLY_LIMIT = 25;
    uint256 public constant NATAL_SUPPLY_LIMIT = 25;
    uint256 public constant TOTAL_SUPPLY_LIMIT = 50;
    
    // Supply counters
    uint256 public birthdaysMinted;
    uint256 public natalsMinted;
    
    // Platform fee in USDC (deducted from sales)
    uint256 public constant PLATFORM_FEE = 500_000;  // $0.50 USDC per order (clearer without floating point)
    address public platformWallet;
    
    // Track withdrawn fees to prevent double-charging
    uint256 public lastWithdrawnTokenId;
    
    struct Order {
        SongType songType;
        string orderDataUri;
        address orderedBy;
        uint256 orderedAt;
        uint256 pricePaid;
        bool fulfilled;
        string songUri;
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
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event Withdrawal(uint256 creatorAmount, uint256 platformFee);
    
    constructor(
        address _usdc,
        address _platformWallet
    ) ERC721("Birthday Songs", "BDAY") Ownable(msg.sender) {
        USDC = IERC20(_usdc);
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev Mint a birthday song order ($25)
     */
    function mintBirthdaySong(string calldata orderDataUri) external returns (uint256) {
        require(birthdaysMinted < BIRTHDAY_SUPPLY_LIMIT, "Birthday songs sold out");
        birthdaysMinted++;
        return _mintOrder(SongType.BIRTHDAY, orderDataUri, birthdayPrice);
    }
    
    /**
     * @dev Mint a natal chart song order ($250)
     */
    function mintNatalSong(string calldata orderDataUri) external returns (uint256) {
        require(natalsMinted < NATAL_SUPPLY_LIMIT, "Natal chart songs sold out");
        natalsMinted++;
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
     * @dev Creator marks an order as fulfilled
     */
    function fulfillOrder(uint256 tokenId, string calldata songUri) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        require(!orders[tokenId].fulfilled, "Already fulfilled");
        require(bytes(songUri).length > 0, "Song URI required");
        
        orders[tokenId].fulfilled = true;
        orders[tokenId].songUri = songUri;
        
        emit OrderFulfilled(tokenId, songUri);
    }
    
    
    /**
     * @dev Update prices (in USDC with 6 decimals)
     */
    function setPrices(uint256 _birthdayPrice, uint256 _natalPrice) external onlyOwner {
        birthdayPrice = _birthdayPrice;
        natalPrice = _natalPrice;
        emit PricesUpdated(_birthdayPrice, _natalPrice);
    }
    
    function setPlatformWallet(address _platformWallet) external onlyOwner {
        require(_platformWallet != address(0), "Invalid platform wallet");
        address oldWallet = platformWallet;
        platformWallet = _platformWallet;
        emit PlatformWalletUpdated(oldWallet, _platformWallet);
    }
    
    function withdraw() external onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        
        // Calculate platform fees only for new orders since last withdrawal
        uint256 newOrders = _nextTokenId - lastWithdrawnTokenId;
        uint256 totalPlatformFee = newOrders * PLATFORM_FEE;
        
        // Ensure we don't deduct more than the balance
        if (totalPlatformFee > balance) {
            totalPlatformFee = balance;
        }
        
        uint256 creatorAmount = balance - totalPlatformFee;
        
        // Update the withdrawal tracker
        lastWithdrawnTokenId = _nextTokenId;
        
        // Transfer platform fees to platform wallet
        if (totalPlatformFee > 0) {
            USDC.safeTransfer(platformWallet, totalPlatformFee);
        }
        
        // Transfer remaining to contract owner
        if (creatorAmount > 0) {
            USDC.safeTransfer(owner(), creatorAmount);
        }
        
        emit Withdrawal(creatorAmount, totalPlatformFee);
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
    
    function getSupplyInfo() external view returns (
        uint256 birthdaysMinted_,
        uint256 birthdaysRemaining,
        uint256 birthdayLimit,
        bool birthdaysSoldOut,
        uint256 natalsMinted_,
        uint256 natalsRemaining,
        uint256 natalLimit,
        bool natalsSoldOut,
        uint256 totalMinted,
        uint256 totalRemaining,
        uint256 totalLimit
    ) {
        birthdaysMinted_ = birthdaysMinted;
        birthdaysRemaining = BIRTHDAY_SUPPLY_LIMIT - birthdaysMinted;
        birthdayLimit = BIRTHDAY_SUPPLY_LIMIT;
        birthdaysSoldOut = birthdaysMinted >= BIRTHDAY_SUPPLY_LIMIT;
        
        natalsMinted_ = natalsMinted;
        natalsRemaining = NATAL_SUPPLY_LIMIT - natalsMinted;
        natalLimit = NATAL_SUPPLY_LIMIT;
        natalsSoldOut = natalsMinted >= NATAL_SUPPLY_LIMIT;
        
        totalMinted = birthdaysMinted + natalsMinted;
        totalRemaining = TOTAL_SUPPLY_LIMIT - totalMinted;
        totalLimit = TOTAL_SUPPLY_LIMIT;
    }
    
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
