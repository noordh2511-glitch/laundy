import React, { useState, useEffect } from 'react';
import './App.css';

// ثوابت النظام
const SHOP_NAME = 'بيت الغسيل والكوي';

// أنواع المستخدمين
const USER_ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
} as const;

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('login');

  const handleLogin = () => {
    if (username && password) {
      if (
        (username === 'admin' && password === '123456') ||
        (username === 'employee' && password === '123456')
      ) {
        setIsLoggedIn(true);
        setView('pos');
      } else {
        alert('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setView('login');
    setUsername('');
    setPassword('');
  };

  if (!isLoggedIn) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          direction: 'rtl',
        }}
      >
        <div
          style={{
            background: 'white',
            padding: '40px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            width: '100%',
            maxWidth: '400px',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <h1 style={{ color: '#4f46e5', margin: 0 }}>{SHOP_NAME}</h1>
            <p style={{ color: '#6b7280', margin: '5px 0 0 0' }}>
              نظام إدارة دراي كلين
            </p>
          </div>

          <input
            type="text"
            placeholder="اسم المستخدم"
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '20px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '16px',
            }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="كلمة المرور"
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '20px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '16px',
            }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '15px',
              background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            تسجيل الدخول
          </button>

          <div
            style={{
              marginTop: '30px',
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '10px',
            }}
          >
            <h4 style={{ marginTop: 0, color: '#374151' }}>حسابات تجريبية:</h4>
            <div
              style={{
                marginBottom: '10px',
                padding: '10px',
                background: 'white',
                borderRadius: '8px',
              }}
            >
              <strong>مدير النظام:</strong>
              <br />
              المستخدم: admin
              <br />
              كلمة المرور: 123456
            </div>
            <div
              style={{
                padding: '10px',
                background: 'white',
                borderRadius: '8px',
              }}
            >
              <strong>موظف:</strong>
              <br />
              المستخدم: employee
              <br />
              كلمة المرور: 123456
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ minHeight: '100vh', direction: 'rtl', background: '#f8fafc' }}
    >
      {/* شريط المستخدم */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'white',
          padding: '15px 20px',
          borderRadius: '12px',
          margin: '20px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f46e5, #3730a3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
            }}
          >
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: '600' }}>
              {username === 'admin' ? 'مدير النظام' : 'موظف'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              {SHOP_NAME}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            background: '#fee2e2',
            color: '#ef4444',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          تسجيل الخروج
        </button>
      </div>

      {/* شريط التنقل */}
      <div
        style={{
          display: 'flex',
          background: 'white',
          borderRadius: '12px',
          padding: '8px',
          margin: '0 20px 20px',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setView('pos')}
          style={{
            border: 'none',
            background: view === 'pos' ? '#4f46e5' : 'transparent',
            color: view === 'pos' ? 'white' : '#64748b',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🧺 نقطة بيع
        </button>

        {username === 'admin' && (
          <>
            <button
              onClick={() => setView('dashboard')}
              style={{
                border: 'none',
                background: view === 'dashboard' ? '#4f46e5' : 'transparent',
                color: view === 'dashboard' ? 'white' : '#64748b',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              📊 لوحة التحكم
            </button>

            <button
              onClick={() => setView('settings')}
              style={{
                border: 'none',
                background: view === 'settings' ? '#4f46e5' : 'transparent',
                color: view === 'settings' ? 'white' : '#64748b',
                padding: '12px 20px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              ⚙️ الإعدادات
            </button>
          </>
        )}
      </div>

      {/* المحتوى */}
      <div style={{ padding: '20px' }}>
        {view === 'pos' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>نقطة البيع</h2>
            <p>نظام نقطة البيع سيعمل هنا...</p>
          </div>
        )}

        {view === 'dashboard' && username === 'admin' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>لوحة التحكم</h2>
            <p>الإحصائيات والرسوم البيانية ستظهر هنا...</p>
          </div>
        )}

        {view === 'settings' && username === 'admin' && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>الإعدادات</h2>
            <p>إدارة المنتجات والمستخدمين ستكون هنا...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
