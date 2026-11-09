import React, { useState, useEffect } from 'react';
import {
  Webhook,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  Link2,
  Save,
  Radio,
  ExternalLink,
  ShieldAlert,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export const MakeComIntegration: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadConfig = () => {
    api.getMakeComConfig().then((res) => {
      setConfig(res);
      if (res.webhook_url_masked && !webhookUrl) {
        setWebhookUrl(res.webhook_url_masked);
      }
    });
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) return;

    setSaving(true);
    setSaveMessage(null);
    try {
      await api.saveMakeComSettings(webhookUrl.trim());
      setSaveMessage("Webhook URL saved securely to system configuration.");
      loadConfig();
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testMakeComWebhook(webhookUrl.startsWith('http') ? webhookUrl : undefined);
      setTestResult(res);
      loadConfig();
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const events = [
    {
      id: "inventory_replenishment_required",
      name: "Replenishment Recommendation Generated",
      trigger: "Agent detects stock gap and computes reorder quantity.",
      payload: {
        "event": "inventory_replenishment_required",
        "product_id": "SKU0001",
        "product_name": "Milk 1L",
        "current_stock": 9,
        "reorder_point": 10,
        "recommended_quantity": 24,
        "priority": "Critical",
        "supplier_id": "SUP012",
        "currency": "INR"
      }
    },
    {
      id: "purchase_order_approved",
      name: "Purchase Order Approved by Manager",
      trigger: "Inventory manager verifies and approves PO draft.",
      payload: {
        "event": "purchase_order_approved",
        "po_id": "PO000251",
        "product_id": "SKU0001",
        "order_quantity": 24,
        "total_order_value_inr": 4295.04,
        "supplier_id": "SUP012",
        "expected_delivery_date": "2026-11-10"
      }
    },
    {
      id: "critical_stock_detected",
      name: "Critical Stock Level Alert",
      trigger: "Current stock days of cover drops below 3.0 days.",
      payload: {
        "event": "critical_stock_detected",
        "product_id": "SKU0002",
        "product_name": "Curd 500g",
        "days_of_cover": 3.8,
        "current_stock": 6,
        "safety_stock": 6
      }
    },
    {
      id: "high_demand_forecast_detected",
      name: "High Demand Surge Forecasted",
      trigger: "Trend multiplier exceeds 1.25x with upcoming surge.",
      payload: {
        "event": "high_demand_forecast_detected",
        "product_id": "SKU0078",
        "product_name": "Cucumber 1kg",
        "trend_adjustment": 1.25,
        "predicted_demand_14_days": 69.5
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-navy-900 text-white rounded-2xl p-6 shadow-md border border-purple-900/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300 shrink-0">
              <Webhook className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold tracking-tight">Make.com Webhook Automation</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  config?.status === 'Connected'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {config?.status || 'Disconnected'}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Connect RetailIQ directly to Make.com scenarios to automate email notifications, supplier alert routing,
                and manager approval workflows. Works gracefully in standalone mode when disconnected.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Webhook Configuration & Test Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Settings Form */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Link2 className="h-4 w-4 text-purple-600" />
              Webhook Endpoint Configuration
            </h4>
            <p className="text-xs text-slate-500">
              Enter your Make.com Custom Webhook URL (from the "Custom Webhook" trigger module)
            </p>
          </div>

          <form onSubmit={handleSaveUrl} className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Make.com Webhook URL:</label>
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hook.eu1.make.com/xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={saving || !webhookUrl.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving...' : 'Save Webhook URL'}</span>
              </button>

              <button
                type="button"
                onClick={handleTestWebhook}
                disabled={testing || !webhookUrl.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition-colors disabled:opacity-50"
              >
                <Radio className={`h-3.5 w-3.5 ${testing ? 'animate-pulse' : ''}`} />
                <span>{testing ? 'Testing Endpoint...' : 'Send Test Webhook'}</span>
              </button>
            </div>
          </form>

          {saveMessage && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              {saveMessage}
            </div>
          )}

          {/* Test Result Display */}
          {testResult && (
            <div className={`p-4 rounded-xl border text-xs space-y-2 ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                <span>{testResult.message}</span>
              </div>
              {testResult.status_code && (
                <p className="font-mono text-[11px]">HTTP Status: {testResult.status_code}</p>
              )}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Execution Diagnostics */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">Live Connection Diagnostics</h4>
            <p className="text-xs text-slate-500">Real-time status of Make.com webhook bridge</p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Connection State:</span>
              <span className="font-bold text-slate-900">{config?.status || 'Disconnected'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Last Event Dispatched:</span>
              <span className="font-bold text-slate-900 truncate max-w-[200px]">{config?.last_event || 'None'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="text-slate-500">Last HTTP Response:</span>
              <span className="font-mono font-bold text-slate-900">{config?.last_status_code || '—'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <p className="font-bold text-slate-900">Security Guarantee:</p>
            <p>Webhook URLs and API credentials are kept server-side and never leaked in client bundles.</p>
          </div>
        </div>
      </div>

      {/* Event Definitions & Payload Schemas */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCode className="h-4 w-4 text-blue-600" />
            Configured Make.com Webhook Events & Payload Schemas
          </h4>
          <p className="text-xs text-slate-500">Standardized event payloads dispatched during inventory automation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((ev) => (
            <div key={ev.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{ev.name}</span>
                <span className="font-mono text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                  {ev.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{ev.trigger}</p>
              <pre className="p-2.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[10px] overflow-x-auto">
                {JSON.stringify(ev.payload, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

