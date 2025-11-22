// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Escrow - X402 Payment Escrow Contract
/// @notice Holds payments in escrow for service delivery
/// @dev Uses ReentrancyGuard for security against reentrancy attacks
contract Escrow is ReentrancyGuard {
    /// @notice The ERC20 token used for payments (QUSD)
    IERC20 public immutable token;

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
        token = IERC20(_token);
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
            token.transferFrom(msg.sender, address(this), amount),
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
            token.transfer(payment.recipient, payment.amount),
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
            token.transfer(payment.payer, payment.amount),
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
}
