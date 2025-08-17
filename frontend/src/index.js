import React from 'react';
import ReactDOM from 'react-dom/client';
import AdminGachaList from './AdminGachaList';
import UserGachaList from './UserGachaList';

function App() {
  const [page, setPage] = React.useState('top');
  return (
    <div>
      <nav style={{ margin: 16 }}>
        <button onClick={() => setPage('top')}>トップ</button>
        <button onClick={() => setPage('user')}>ガチャ一覧</button>
        <button onClick={() => setPage('admin')}>ガチャ管理</button>
      </nav>
      {page === 'top' && <h1>Online Gacha Frontend</h1>}
      {page === 'user' && <UserGachaList />}
      {page === 'admin' && <AdminGachaList />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
