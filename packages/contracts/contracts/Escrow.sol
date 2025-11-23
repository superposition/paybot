// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Escrow - X402 Payment Escrow Contract with Gasless Transactions
/// @notice Holds payments in escrow for service delivery with support for EIP-712 signatures
/// @dev Uses ReentrancyGuard for security against reentrancy attacks
contract Escrow is ReentrancyGuard {
    using ECDSA for bytes32;

    /// @notice The ERC20 token used for payments (QUSD)
    IERC20Permit public immutable token;

    /// @notice EIP-712 domain separator
    bytes32 public immutable DOMAIN_SEPARATOR;

    /// @notice EIP-712 typehash for PaymentIntent
    bytes32 public constant PAYMENT_INTENT_TYPEHASH = keccak256(
        "PaymentIntent(bytes32 paymentId,address payer,address recipient,uint256 amount,uint256 duration,uint256 nonce,uint256 deadline)"
    );

    /// @notice Nonces for signature replay protection
    mapping(address => uint256) public nonces;

    /// @notice Payment structure
    /// @param payer Address that created the payment
    /// @param recipient Address that will receive the payment
    /// @param amount Amount of tokens escrowed
    /// @param expiresAt Timestamp when payment expires
    /// @param claimed Whether the payment has been claimed
    /// @param refunded Whether the payment has been refunded
    struct Payment {
        address payer;
        address recipient;
        uint256 amount;
        uint256 expiresAt;
        bool claimed;
        bool refunded;
    }

    /// @notice Mapping of payment IDs to Payment structs
    mapping(bytes32 => Payment) public payments;

    /// @notice Emitted when a new payment is created
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed payer,
        address indexed recipient,
        uint256 amount,
        uint256 expiresAt
    );

    /// @notice Emitted when a payment is claimed by the recipient
    event PaymentClaimed(bytes32 indexed paymentId);

    /// @notice Emitted when a payment is refunded to the payer
    event PaymentRefunded(bytes32 indexed paymentId);

    /// @notice Creates the Escrow contract
    /// @param _token Address of the ERC20 token to use for payments
    constructor(address _token) {
        require(_token != address(0), "Invalid token address");
        token = IERC20Permit(_token);

        // Initialize EIP-712 domain separator
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("X402 Escrow")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Creates a new escrowed payment
    /// @param paymentId Unique identifier for the payment
    /// @param recipient Address that can claim the payment
    /// @param amount Amount of tokens to escrow
    /// @param duration Time in seconds until payment expires
    /// @dev Transfers tokens from msg.sender to this contract
    function createPayment(
        bytes32 paymentId,
        address recipient,
        uint256 amount,
        uint256 duration
    ) external nonReentrant {
        require(payments[paymentId].payer == address(0), "Payment already exists");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");

        require(
            IERC20(address(token)).transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );

        uint256 expiresAt = block.timestamp + duration;

        payments[paymentId] = Payment({
            payer: msg.sender,
            recipient: recipient,
            amount: amount,
            expiresAt: expiresAt,
            claimed: false,
            refunded: false
        });

        emit PaymentCreated(paymentId, msg.sender, recipient, amount, expiresAt);
    }

    /// @notice Claims a payment (recipient only, before expiry)
    /// @param paymentId ID of the payment to claim
    /// @dev Transfers tokens to the recipient
    function claimPayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];

        require(msg.sender == payment.recipient, "Only recipient can claim");
        require(!payment.claimed && !payment.refunded, "Payment already processed");
        require(block.timestamp <= payment.expiresAt, "Payment expired");

        payment.claimed = true;

        require(
            IERC20(address(token)).transfer(payment.recipient, payment.amount),
            "Token transfer failed"
        );

        emit PaymentClaimed(paymentId);
    }

    /// @notice Refunds a payment (payer only, after expiry)
    /// @param paymentId ID of the payment to refund
    /// @dev Transfers tokens back to the payer
    function refundPayment(bytes32 paymentId) external nonReentrant {
        Payment storage payment = payments[paymentId];

        require(msg.sender == payment.payer, "Only payer can refund");
        require(!payment.claimed && !payment.refunded, "Payment already processed");
        require(block.timestamp > payment.expiresAt, "Payment not expired yet");

        payment.refunded = true;

        require(
            IERC20(address(token)).transfer(payment.payer, payment.amount),
            "Token transfer failed"
        );

        emit PaymentRefunded(paymentId);
    }

    /// @notice Gets payment details
    /// @param paymentId ID of the payment
    /// @return Payment struct containing all payment details
    function getPayment(bytes32 paymentId) external view returns (Payment memory) {
        return payments[paymentId];
    }

    /// @notice Creates a gasless payment using EIP-2612 permit and EIP-712 signature
    /// @param paymentId Unique identifier for the payment
    /// @param payer Address of the user who signed the payment intent
    /// @param recipient Address that can claim the payment
    /// @param amount Amount of tokens to escrow
    /// @param duration Time in seconds until payment expires
    /// @param deadline Deadline for the signature (both permit and payment intent)
    /// @param v Signature parameter v (for payment intent)
    /// @param r Signature parameter r (for payment intent)
    /// @param s Signature parameter s (for payment intent)
    /// @param permitV Signature parameter v (for permit)
    /// @param permitR Signature parameter r (for permit)
    /// @param permitS Signature parameter s (for permit)
    /// @dev Facilitator calls this function and pays gas. Uses EIP-2612 permit for token approval.
    function createPaymentWithPermit(
        bytes32 paymentId,
        address payer,
        address recipient,
        uint256 amount,
        uint256 duration,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint8 permitV,
        bytes32 permitR,
        bytes32 permitS
    ) external nonReentrant {
        require(payments[paymentId].payer == address(0), "Payment already exists");
        require(payer != address(0), "Invalid payer");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        require(duration > 0, "Duration must be greater than 0");
        require(block.timestamp <= deadline, "Signature expired");

        // Verify payment intent signature
        bytes32 structHash = keccak256(
            abi.encode(
                PAYMENT_INTENT_TYPEHASH,
                paymentId,
                payer,
                recipient,
                amount,
                duration,
                nonces[payer],
                deadline
            )
        );

        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address signer = digest.recover(v, r, s);
        require(signer == payer, "Invalid payment intent signature");

        // Increment nonce to prevent replay
        nonces[payer]++;

        // Execute permit (EIP-2612) - user pre-approves token transfer
        token.permit(payer, address(this), amount, deadline, permitV, permitR, permitS);

        // Transfer tokens from payer to escrow
        require(
            IERC20(address(token)).transferFrom(payer, address(this), amount),
            "Token transfer failed"
        );

        uint256 expiresAt = block.timestamp + duration;

        payments[paymentId] = Payment({
            payer: payer,
            recipient: recipient,
            amount: amount,
            expiresAt: expiresAt,
            claimed: false,
            refunded: false
        });

        emit PaymentCreated(paymentId, payer, recipient, amount, expiresAt);
    }
}
