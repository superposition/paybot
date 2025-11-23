import { BotAccessGate } from "./components/gate/BotAccessGate";
import {
  X402_CONTRACTS,
  X402_ENDPOINTS,
  SERVICE_PRICES,
  X402_CONFIG,
  ROBOT_CONFIG,
} from "./config/x402";
import "./App.css";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">PayBot</h1>
              <p className="text-gray-600 mt-1">
                Robot Control with X402 Micropayments
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Network</div>
              <div className="text-sm font-semibold text-gray-900">
                Chain {X402_CONFIG.chainId}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <BotAccessGate
          recipient={ROBOT_CONFIG.providerAddress}
          serviceType="robotFullAccess"
          endpoint={ROBOT_CONFIG.controlUrl}
          method="robot.control"
          timeoutSeconds={X402_CONFIG.defaultTimeout}
          botId={ROBOT_CONFIG.botId}
          botName={ROBOT_CONFIG.botName}
          title="Robot Access Required"
          description={`Pay to control ${ROBOT_CONFIG.botName} for ${Math.floor(X402_CONFIG.defaultTimeout / 60)} minutes`}
          showPaymentStatus={true}
          onPaymentSuccess={(response) => {
            console.log("Payment success:", response);
          }}
          onPaymentError={(error) => {
            console.error("Payment error:", error);
          }}
        >
          {(paymentRecord) => (
            <div className="h-[calc(100vh-200px)]">
              <iframe
                className="rounded-md border border-gray-300"
                width="100%"
                height="100%"
                src="http://192.168.0.221:5000"
                title={`${ROBOT_CONFIG.botName} - Robot Control Interface`}
                allow="cross-origin-isolated; fullscreen; camera; microphone"
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
          )}
        </BotAccessGate>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              Built with X402 Protocol • Gasless Payments • EIP-2612 + EIP-712
            </p>
            <div className="flex gap-4 text-sm text-gray-500">
              <span>Token: {X402_CONTRACTS.qusdToken.slice(0, 6)}...</span>
              <span>Escrow: {X402_CONTRACTS.escrow.slice(0, 6)}...</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
