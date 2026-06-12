import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth, LoginHistoryRecord } from '../context/AuthContext';
import { defaultFirebaseConfig } from '../utils/firebase';
import { DB, Settings as SettingsType } from '../utils/db';
import { 
  Settings as SettingsIcon, 
  Save, 
  Upload, 
  Download, 
  RotateCcw, 
  FileJson, 
  ShieldAlert,
  Image,
  Database,
  Users as UsersIcon,
  Activity
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { settings, refreshData, showToast } = useApp();
  const { user, isMock, updateConfig, resetConfig, createAppUser, deleteAppUser, getAppUsers } = useAuth();

  const isSuperAdmin = user?.email.toLowerCase() === 'viki@wolsales.com';
  const userRole = user?.role || (isSuperAdmin ? 'super_admin' : (user?.email.toLowerCase() === 'admin@wolsales.com' ? 'admin' : 'staff'));

  // User creation states
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'staff'>('staff');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [usersRefreshKey, setUsersRefreshKey] = useState(0);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUserPassword.length < 6) {
      showToast('Password must be at least 6 characters long', 'warning');
      return;
    }
    setIsCreatingUser(true);
    try {
      await createAppUser(newUserEmail, newUserPassword, newUserRole);
      showToast(`Account for ${newUserEmail} created successfully`, 'success');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('staff');
      setUsersRefreshKey(prev => prev + 1);
    } catch (err: any) {
      showToast(err.message || 'Failed to create user', 'danger');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (email: string) => {
    if (confirm(`Are you sure you want to delete account ${email}?`)) {
      try {
        await deleteAppUser(email);
        showToast('User deleted successfully', 'success');
        setUsersRefreshKey(prev => prev + 1);
      } catch (err: any) {
        showToast(err.message || 'Failed to delete user', 'danger');
      }
    }
  };

  // Forms states
  const [shopName, setShopName] = useState(settings.shopName || '');
  const [logo, setLogo] = useState(settings.logo || '');
  const [gstin, setGstin] = useState(settings.gstin || '');
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || '');
  const [taxRate, setTaxRate] = useState<number>(settings.taxRate || 18);
  const [terms, setTerms] = useState(settings.terms || '');
  const [defaultPrinterLayout, setDefaultPrinterLayout] = useState<'3inch' | '4inch' | 'a5' | 'a4'>(settings.defaultPrinterLayout || '3inch');
  const [upiId, setUpiId] = useState(settings.upiId || '');
  const [bankName, setBankName] = useState(settings.bankName || '');
  const [bankAccNo, setBankAccNo] = useState(settings.bankAccNo || '');
  const [bankIFSC, setBankIFSC] = useState(settings.bankIFSC || '');
  const [showTotalWeightReceipt, setShowTotalWeightReceipt] = useState<boolean>(settings.showTotalWeightReceipt !== false);
  const [showGstReceipt, setShowGstReceipt] = useState<boolean>(settings.showGstReceipt !== false);
  const [showQrPaymentReceipt, setShowQrPaymentReceipt] = useState<boolean>(settings.showQrPaymentReceipt !== false);

  // Firebase Config States
  const saved = localStorage.getItem('firebase_config');
  const activeConfig = saved ? JSON.parse(saved) : defaultFirebaseConfig;
  const [apiKey, setApiKey] = useState(activeConfig.apiKey);
  const [authDomain, setAuthDomain] = useState(activeConfig.authDomain);
  const [databaseURL, setDatabaseURL] = useState(activeConfig.databaseURL);
  const [projectId, setProjectId] = useState(activeConfig.projectId);
  const [storageBucket, setStorageBucket] = useState(activeConfig.storageBucket);
  const [messagingSenderId, setMessagingSenderId] = useState(activeConfig.messagingSenderId);
  const [appId, setAppId] = useState(activeConfig.appId);

  // File states for restore
  const [restoreFileJson, setRestoreFileJson] = useState<string>('');

  // Login History States & Action
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRecord[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('login_history') || '[]') as LoginHistoryRecord[];
    } catch (e) {
      return [];
    }
  });
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'failed'>('all');

  useEffect(() => {
    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const key = customEvent.detail?.key;
      if (key === 'login_history') {
        try {
          const updated = JSON.parse(localStorage.getItem('login_history') || '[]') as LoginHistoryRecord[];
          setLoginHistory(updated);
        } catch (err) {
          console.error("Error reloading login history in settings:", err);
        }
      } else if (key === 'app_users') {
        setUsersRefreshKey(prev => prev + 1);
      }
    };

    window.addEventListener('local-db-update', handleDbUpdate);
    return () => {
      window.removeEventListener('local-db-update', handleDbUpdate);
    };
  }, []);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all login audit logs? This cannot be undone.')) {
      DB.removeKey('login_history');
      setLoginHistory([]);
      showToast('Login history audit logs cleared', 'success');
    }
  };

  const filteredHistory = loginHistory.filter(h => {
    if (historyFilter === 'all') return true;
    return h.status === historyFilter;
  });

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName || !phone) {
      showToast('Shop Name and Phone number are required', 'warning');
      return;
    }

    const updatedSettings: SettingsType = {
      shopName,
      logo,
      gstin,
      address,
      phone,
      invoicePrefix,
      taxRate,
      terms,
      defaultPrinterLayout,
      upiId,
      bankName,
      bankAccNo,
      bankIFSC,
      showTotalWeightReceipt,
      showGstReceipt,
      showQrPaymentReceipt
    };

    DB.saveSettings(updatedSettings);
    refreshData();
    showToast('System configuration saved successfully', 'success');
  };

  // Convert uploaded logo file to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Logo file size must be less than 2MB', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setLogo(base64String);
      showToast('Logo uploaded successfully', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleBackupDownload = () => {
    const dataStr = DB.exportDatabase();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `Supermarket_Billing_Backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showToast('Database JSON backup downloaded', 'success');
  };

  const handleDownloadAutoBackup = () => {
    const backupStr = localStorage.getItem('billing_last_auto_backup');
    if (!backupStr) {
      showToast('No automated backup found yet.', 'warning');
      return;
    }
    
    try {
      const parsed = JSON.parse(backupStr);
      const dataStr = JSON.stringify(parsed.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const timestamp = parsed.timestamp ? parsed.timestamp.slice(0, 10) : new Date().toISOString().slice(0, 10);
      const action = parsed.action || 'auto';
      const email = parsed.email ? parsed.email.split('@')[0] : 'user';
      const exportFileDefaultName = `Supermarket_Billing_AutoBackup_${timestamp}_${email}_${action}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      showToast(`Last auto backup from ${action} downloaded`, 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to download automated backup', 'danger');
    }
  };

  const handleRestoreUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setRestoreFileJson(result);
    };
    reader.readAsText(file);
  };

  const handleApplyRestore = () => {
    if (!restoreFileJson) {
      showToast('Please select a valid JSON backup file first', 'warning');
      return;
    }

    if (confirm('WARNING: Restoring will overwrite all current products, sales, and purchases. Do you want to proceed?')) {
      const success = DB.importDatabase(restoreFileJson);
      if (success) {
        refreshData();
        setRestoreFileJson('');
        showToast('Database restored successfully from backup', 'success');
      } else {
        showToast('Failed to restore. Invalid backup file structure', 'danger');
      }
    }
  };

  const handleFactoryReset = () => {
    if (confirm('CAUTION: This will delete ALL transactions, products, suppliers, and reset everything to initial demo data. Are you absolutely sure?')) {
      DB.reset();
      refreshData();
      
      // Sync local component state
      const fresh = DB.getSettings();
      setShopName(fresh.shopName);
      setLogo(fresh.logo);
      setGstin(fresh.gstin);
      setAddress(fresh.address);
      setPhone(fresh.phone);
      setInvoicePrefix(fresh.invoicePrefix);
      setTaxRate(fresh.taxRate);
      setTerms(fresh.terms);
      setDefaultPrinterLayout(fresh.defaultPrinterLayout || '3inch');
      setUpiId(fresh.upiId || '');
      setBankName(fresh.bankName || '');
      setBankAccNo(fresh.bankAccNo || '');
      setBankIFSC(fresh.bankIFSC || '');
      setShowTotalWeightReceipt(fresh.showTotalWeightReceipt !== false);
      setShowGstReceipt(fresh.showGstReceipt !== false);
      setShowQrPaymentReceipt(fresh.showQrPaymentReceipt !== false);

      showToast('System factory reset completed', 'danger');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div className="page-header">
        <div>
          <h1>Settings & Configurations</h1>
          <p>Edit invoice templates, print layouts, tax rates, and database backup controls</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Side: Shop Configuration Form */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SettingsIcon size={18} style={{ color: 'var(--primary)' }} />
            <span>Store Profile & Tax Rates</span>
          </h3>

          <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label>Store / Shop Name *</label>
              <input
                type="text"
                className="form-control"
                required
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            {/* Logo upload widget */}
            <div className="form-group">
              <label>Invoice Company Logo</label>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {logo ? (
                  <img 
                    src={logo} 
                    alt="Store Logo" 
                    style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-color)', background: 'white' }} 
                  />
                ) : (
                  <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    <Image size={24} />
                  </div>
                )}
                <div>
                  <label htmlFor="logo-file" className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>Upload Image</span>
                  </label>
                  <input 
                    type="file" 
                    id="logo-file" 
                    accept="image/*" 
                    onChange={handleLogoUpload} 
                    style={{ display: 'none' }} 
                  />
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Max size 2MB (PNG / JPG). Prints on A4.</p>
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>GST Number (GSTIN)</label>
                <input
                  type="text"
                  className="form-control"
                  style={{ textTransform: 'uppercase' }}
                  placeholder="e.g. 27AAACS1234A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                />
              </div>

              <div className="form-group">
                <label>Default GST Tax Rate (%)</label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Official Store Contact *</label>
                <input
                  type="text"
                  className="form-control"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Invoice Serial Prefix</label>
                <input
                  type="text"
                  className="form-control"
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Official Store Address</label>
              <textarea
                className="form-control"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>BANK & UPI SETTINGS</h4>
            <div className="grid-2">
              <div className="form-group">
                <label>UPI ID (for payments & QR)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. store@okaxis"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Bank Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Bank Account Number</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. 5010012345678"
                  value={bankAccNo}
                  onChange={(e) => setBankAccNo(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Bank IFSC Code</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. HDFC0000123"
                  style={{ textTransform: 'uppercase' }}
                  value={bankIFSC}
                  onChange={(e) => setBankIFSC(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Default Print Layout / Receipt Format</label>
              <select
                className="form-control"
                value={defaultPrinterLayout}
                onChange={(e) => setDefaultPrinterLayout(e.target.value as any)}
              >
                <option value="3inch">3 Inch Thermal Receipt (80mm)</option>
                <option value="4inch">4 Inch Thermal Receipt (100mm)</option>
                <option value="a5">A5 Invoice (148mm x 210mm)</option>
                <option value="a4">A4 Invoice (210mm x 297mm)</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '0.85rem', 
                background: 'var(--bg-input)', 
                padding: '0.6rem 0.8rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius-sm)', 
                cursor: 'pointer',
                userSelect: 'none',
                flex: 1,
                minWidth: '200px'
              }}>
                <input 
                  type="checkbox" 
                  checked={showTotalWeightReceipt} 
                  onChange={(e) => setShowTotalWeightReceipt(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 500 }}>Show Total Weight on Receipt</span>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '0.85rem', 
                background: 'var(--bg-input)', 
                padding: '0.6rem 0.8rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius-sm)', 
                cursor: 'pointer',
                userSelect: 'none',
                flex: 1,
                minWidth: '200px'
              }}>
                <input 
                  type="checkbox" 
                  checked={showGstReceipt} 
                  onChange={(e) => setShowGstReceipt(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 500 }}>Show GST Tax (18%) on Receipt</span>
              </label>

              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '0.85rem', 
                background: 'var(--bg-input)', 
                padding: '0.6rem 0.8rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: 'var(--border-radius-sm)', 
                cursor: 'pointer',
                userSelect: 'none',
                flex: 1,
                minWidth: '200px'
              }}>
                <input 
                  type="checkbox" 
                  checked={showQrPaymentReceipt} 
                  onChange={(e) => setShowQrPaymentReceipt(e.target.checked)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 500 }}>Show QR Code & Payment Info</span>
              </label>
            </div>

            <div className="form-group">
              <label>Terms & Conditions (Prints on Invoices)</label>
              <textarea
                className="form-control"
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', padding: '0.6rem 1.5rem' }}>
              <Save size={16} />
              <span>Save System Settings</span>
            </button>
          </form>
        </div>

        {/* Right Side: Data Utilities / Backup / Reset */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Firebase Configuration Panel */}
          {isSuperAdmin && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Database size={18} style={{ color: 'var(--primary)' }} />
                <span>Firebase SDK Configurations</span>
              </h3>

              <div style={{
                background: isMock ? 'var(--warning-light)' : 'var(--success-light)',
                border: `1px solid ${isMock ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                borderRadius: 'var(--border-radius-sm)',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                fontSize: '0.8rem',
                color: isMock ? 'var(--warning)' : 'var(--success)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}>
                <div><strong>Status:</strong> {isMock ? 'Offline Mock Mode Active' : 'Firebase Auth Active'}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                  {isMock 
                    ? 'Currently using mock databases and login offline.' 
                    : `Connected to Firebase project: ${projectId}`}
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                updateConfig({ apiKey, authDomain, databaseURL, projectId, storageBucket, messagingSenderId, appId });
                showToast('Firebase configuration updated. Page reloading...', 'success');
              }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>API Key</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>

                <div className="grid-2" style={{ gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Auth Domain</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      value={authDomain}
                      onChange={(e) => setAuthDomain(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Project ID</label>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Database URL</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    value={databaseURL}
                    onChange={(e) => setDatabaseURL(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
                  >
                    <Save size={14} />
                    <span>Save Config</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      resetConfig();
                      showToast('Firebase configuration reset to default', 'info');
                    }}
                    style={{ padding: '0.5rem', fontSize: '0.8rem' }}
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Backup & Restore */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileJson size={18} style={{ color: 'var(--info)' }} />
              <span>Database Backup & Restore</span>
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Download a JSON file containing all products, clients, suppliers, and billing transactions. Keep this safe to recover your store data.
                </p>
                <button className="btn btn-secondary" onClick={handleBackupDownload} style={{ marginTop: '0.75rem', width: '100%' }}>
                  <Download size={16} />
                  <span>Download Backup JSON</span>
                </button>
                <button className="btn btn-secondary" onClick={handleDownloadAutoBackup} style={{ marginTop: '0.5rem', width: '100%', border: '1px dashed var(--primary)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <RotateCcw size={16} />
                  <span>Download Last Auto-Backup</span>
                </button>
              </div>

              <hr style={{ borderColor: 'var(--border-color)' }} />

              <div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Restore your database from an existing backup JSON file. This will wipe and overwrite all current values.
                </p>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <input
                    type="file"
                    accept=".json"
                    id="restore-file"
                    style={{ display: 'none' }}
                    onChange={handleRestoreUpload}
                  />
                  <label htmlFor="restore-file" className="btn btn-secondary" style={{ flex: 1, cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>Select Backup File</span>
                  </label>

                  <button 
                    className="btn btn-primary" 
                    onClick={handleApplyRestore}
                    disabled={!restoreFileJson}
                    style={{ flex: 1 }}
                  >
                    <span>Apply Restore</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* User & Staff Management Panel */}
          {(isSuperAdmin || userRole === 'admin') && (
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UsersIcon size={18} style={{ color: 'var(--info)' }} />
                <span>User & Staff Management</span>
              </h3>

              {/* Form to create a new user */}
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>CREATE NEW ACCOUNT</h4>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '0.75rem' }}>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="user@wolsales.com"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                  />
                </div>

                <div className="grid-2" style={{ gap: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Password</label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="min 6 chars"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '0.75rem' }}>Account Role</label>
                    <select
                      className="form-control"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'staff')}
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', height: '34px' }}
                    >
                      {isSuperAdmin && <option value="admin">Admin</option>}
                      <option value="staff">Staff</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem', fontSize: '0.8rem', width: '100%', marginTop: '0.5rem' }}
                  disabled={isCreatingUser}
                >
                  {isCreatingUser ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>

              {/* List of existing users */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.75rem' }}>ACTIVE ACCOUNTS</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {getAppUsers().filter(u => isSuperAdmin || u.role === 'staff').map((u) => (
                    <div key={u.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden' }}>{u.email}</span>
                        <span style={{ fontSize: '0.65rem', color: u.role === 'admin' ? 'var(--primary)' : 'var(--success)', fontWeight: 500 }}>
                          {u.role.toUpperCase()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(u.email)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--danger)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {getAppUsers().filter(u => isSuperAdmin || u.role === 'staff').length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                      No managed users found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reset Settings */}
          {isSuperAdmin && (
            <div className="glass-panel" style={{ padding: '1.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                <ShieldAlert size={18} />
                <span>Danger Zone</span>
              </h3>
              
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Clear all transactions, products catalog, and vendor ledgers to return the system back to fresh factory demo state.
              </p>
              
              <button className="btn btn-danger" onClick={handleFactoryReset} style={{ width: '100%' }}>
                <RotateCcw size={16} />
                <span>Perform Factory Reset</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Login History Audit Log */}
      {isSuperAdmin && (
        <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Activity size={18} style={{ color: 'var(--primary)' }} />
              <span>Login System History (Authentication Audit Trail)</span>
            </h3>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-input)', padding: '0.2rem', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--border-color)' }}>
                {(['all', 'success', 'failed'] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setHistoryFilter(filter)}
                    style={{
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.75rem',
                      borderRadius: '4px',
                      border: 'none',
                      background: historyFilter === filter ? 'var(--primary)' : 'transparent',
                      color: historyFilter === filter ? 'white' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {filter === 'all' && 'All'}
                    {filter === 'success' && 'Success'}
                    {filter === 'failed' && 'Failures'}
                  </button>
                ))}
              </div>

              {isSuperAdmin && (
                <button 
                  className="btn btn-danger" 
                  onClick={handleClearHistory}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                  disabled={loginHistory.length === 0}
                >
                  Clear Audit Log
                </button>
              )}
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Audits user authentication events including successful sign-ins, incorrect credentials, and account sign-outs.
          </p>

          {filteredHistory.length > 0 ? (
            <div className="table-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Timestamp</th>
                    <th>User / Email</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Action</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Status</th>
                    <th>Audit Log Details / Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'Courier New', fontWeight: 600 }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.email}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${log.action === 'login' ? 'badge-primary' : 'badge-secondary'}`}>
                          {log.action.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-danger'}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ color: log.status === 'failed' ? 'var(--danger)' : 'var(--text-secondary)' }}>
                        {log.details || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius-sm)' }}>
              No authentication logs found for this filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
