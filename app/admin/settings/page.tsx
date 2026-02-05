'use client';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage system configuration and features</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-slate-400 to-slate-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">⚙️</div>
            <p className="text-sm opacity-90 font-medium">System Configuration</p>
            <p className="text-2xl font-bold mt-2">12</p>
            <p className="text-xs opacity-75 mt-2">Active settings</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-teal-400 to-teal-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🎯</div>
            <p className="text-sm opacity-90 font-medium">Features Enabled</p>
            <p className="text-2xl font-bold mt-2">8</p>
            <p className="text-xs opacity-75 mt-2">Out of 10</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-lime-400 to-lime-600 rounded-lg p-6 text-white shadow-lg">
          <div className="text-center">
            <div className="text-4xl mb-2">🔒</div>
            <p className="text-sm opacity-90 font-medium">Security Status</p>
            <p className="text-2xl font-bold mt-2">✓</p>
            <p className="text-xs opacity-75 mt-2">All systems secure</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-bold text-lg text-gray-900">System Configuration</h2>
          <p className="text-sm text-gray-600 mt-1">Core settings for the Lake Directory platform</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Setting</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Description</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Value</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { name: 'Max Businesses', desc: 'Maximum registered businesses', value: '∞' },
                { name: 'Commission Rate', desc: 'Default vendor commission', value: '10%' },
                { name: 'Voucher Expiry', desc: 'Default voucher expiration days', value: '90' },
                { name: 'Min Purchase', desc: 'Minimum purchase amount', value: '$5.00' },
                { name: 'Max Redemption', desc: 'Maximum redemption per user/day', value: '5' },
                { name: 'Rate Limit', desc: 'API requests per minute', value: '1000' },
              ].map((setting, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition`}>
                  <td className="px-6 py-4 font-semibold text-gray-900">{setting.name}</td>
                  <td className="px-6 py-4 text-gray-600">{setting.desc}</td>
                  <td className="px-6 py-4 font-mono text-blue-600 font-semibold">{setting.value}</td>
                  <td className="px-6 py-4">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="font-bold text-lg text-gray-900">Feature Toggles</h2>
          <p className="text-sm text-gray-600 mt-1">Enable or disable platform features</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Feature</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Description</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { name: 'Voucher System', desc: 'Enable voucher creation and redemption', enabled: true },
                { name: 'Business Verification', desc: 'Require business document verification', enabled: true },
                { name: 'Vendor Dashboard', desc: 'Enable vendor portal access', enabled: true },
                { name: 'Email Notifications', desc: 'Send email alerts and updates', enabled: false },
                { name: 'SMS Alerts', desc: 'Send SMS to users on important events', enabled: false },
                { name: 'Analytics Dashboard', desc: 'Enable analytics and reporting', enabled: true },
                { name: 'API Access', desc: 'Allow third-party API integration', enabled: true },
                { name: 'Advanced Search', desc: 'Enable advanced deal filtering', enabled: false },
              ].map((feature, idx) => (
                <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 transition`}>
                  <td className="px-6 py-4 font-semibold text-gray-900">{feature.name}</td>
                  <td className="px-6 py-4 text-gray-600">{feature.desc}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {feature.enabled ? (
                        <>
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-green-700 font-semibold">Enabled</span>
                        </>
                      ) : (
                        <>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <span className="text-gray-600">Disabled</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button className={`font-medium text-xs ${feature.enabled ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                      {feature.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">Backup & Security</h3>
          <div className="space-y-3">
            {[
              { action: 'Last Database Backup', time: '2 hours ago', btn: 'Backup Now' },
              { action: 'Security Audit', time: 'Passed - 3 days ago', btn: 'Run Audit' },
              { action: 'SSL Certificate', time: 'Valid until Dec 25, 2025', btn: 'Renew' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.action}</p>
                  <p className="text-xs text-gray-600 mt-1">{item.time}</p>
                </div>
                <button className="text-blue-600 hover:text-blue-800 font-medium text-xs whitespace-nowrap">
                  {item.btn}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold text-gray-900 mb-4">System Health</h3>
          <div className="space-y-3">
            {[
              { metric: 'API Response Time', value: '145ms', status: '✓' },
              { metric: 'Database Performance', value: '98.5%', status: '✓' },
              { metric: 'Disk Usage', value: '62%', status: '⚠️' },
              { metric: 'Memory Usage', value: '48%', status: '✓' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.status}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.metric}</p>
                    <p className="text-xs text-gray-600">{item.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
