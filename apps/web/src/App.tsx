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
          amountUSD={SERVICE_PRICES.robotFullAccess}
          timeoutSeconds={X402_CONFIG.defaultTimeout}
          serviceType="robot-control"
          botId={ROBOT_CONFIG.botId}
          botName={ROBOT_CONFIG.botName}
          endpoint={ROBOT_CONFIG.controlUrl}
          method="POST"
          title="Robot Access Required"
          description={`Pay ${SERVICE_PRICES.robotFullAccess} QUSD to control ${ROBOT_CONFIG.botName} for ${Math.floor(X402_CONFIG.defaultTimeout / 60)} minutes`}
          showPaymentStatus={true}
          onPaymentCreated={(record) => {
            console.log("Payment created:", record);
          }}
          onAccessGranted={(record) => {
            console.log("Access granted! Payment ID:", record.paymentId);
          }}
          onAccessDenied={() => {
            console.log("Access denied");
          }}
        >
          {(paymentRecord) => (
            <div className="space-y-6">
              {/* Robot Controls Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {ROBOT_CONFIG.botName} Control Panel
                </h2>
                <p className="text-gray-600">
                  You have full access to control the robot. Use the controls
                  below or view the live feed.
                </p>
              </div>

              {/* Robot Video Feed */}
              {ROBOT_CONFIG.controlUrl && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Live Feed
                  </h3>
                  <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
                    <iframe
                      src={ROBOT_CONFIG.controlUrl.replace("/robot/control", "")}
                      className="w-full h-full"
                      title="Robot Live Feed"
                      allow="camera; microphone"
                    />
                  </div>
                </div>
              )}

              {/* Robot Control Buttons */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Movement Controls
                </h3>
                <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                  <div></div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl">
                    ▲<br />
                    <span className="text-sm">Forward</span>
                  </button>
                  <div></div>

                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl">
                    ◄<br />
                    <span className="text-sm">Left</span>
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl">
                    ■<br />
                    <span className="text-sm">Stop</span>
                  </button>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl">
                    ►<br />
                    <span className="text-sm">Right</span>
                  </button>

                  <div></div>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl">
                    ▼<br />
                    <span className="text-sm">Backward</span>
                  </button>
                  <div></div>
                </div>
              </div>

              {/* Payment Info */}
              {paymentRecord && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono text-gray-600">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-semibold">Payment ID:</span>
                      <br />
                      {paymentRecord.paymentId.slice(0, 10)}...
                      {paymentRecord.paymentId.slice(-8)}
                    </div>
                    <div>
                      <span className="font-semibold">Status:</span>
                      <br />
                      <span className="text-green-600 uppercase">
                        {paymentRecord.status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
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
