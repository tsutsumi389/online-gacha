import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminGachaList from './AdminGachaList';

function App() {
  const [page, setPage] = React.useState('top');
  return (
    <div>
      <nav style={{ margin: 16 }}>
        <button onClick={() => setPage('top')}>トップ</button>
        <button onClick={() => setPage('admin')}>ガチャ管理</button>
      </nav>
      {page === 'top' && <h1>Online Gacha Frontend</h1>}
      {page === 'admin' && <AdminGachaList />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
