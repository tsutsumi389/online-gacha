
import React, { useState } from 'react';
import AdminGachaManage from './AdminGachaManage';

const mockGachas = [
  { id: 1, name: 'サンプルガチャA', price: 300, created_at: '2025-08-01' },
  { id: 2, name: 'サンプルガチャB', price: 500, created_at: '2025-08-10' },
];

export default function AdminGachaList() {
  const [showManage, setShowManage] = useState(false);
  const [selectedGacha, setSelectedGacha] = useState(null);

  if (showManage) {
    return <AdminGachaManage gacha={selectedGacha} onBack={() => { setShowManage(false); setSelectedGacha(null); }} />;
  }

  return (
    <div style={{ maxWidth: 800, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h2>ガチャ管理</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <input type="text" placeholder="ガチャ名で検索" style={{ padding: 4, marginRight: 8 }} />
          <button>検索</button>
        </div>
        <button style={{ background: '#1976d2', color: '#fff', padding: '6px 16px', border: 'none', borderRadius: 4 }}
          onClick={() => { setSelectedGacha(null); setShowManage(true); }}>
          新規作成
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>No</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>ガチャ名</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>価格</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>作成日</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>編集</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>削除</th>
            <th style={{ border: '1px solid #ddd', padding: 8 }}>詳細</th>
          </tr>
        </thead>
        <tbody>
          {mockGachas.map((gacha, idx) => (
            <tr key={gacha.id}>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{idx + 1}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{gacha.name}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{gacha.price}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>{gacha.created_at}</td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}>
                <button onClick={() => { setSelectedGacha(gacha); setShowManage(true); }}>編集</button>
              </td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}><button>削除</button></td>
              <td style={{ border: '1px solid #ddd', padding: 8 }}><button>詳細</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
