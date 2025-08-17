import React from 'react';
import ReactDOM from 'react-dom/client';
import MyGachaList from './MyGachaList';
import UserGachaList from './UserGachaList';

function App() {
  const [page, setPage] = React.useState('top');
  return (
    <div>
      <nav style={{ margin: 16 }}>
        <button onClick={() => setPage('top')}>トップ</button>
        <button onClick={() => setPage('gacha-list')}>ガチャ一覧</button>
        <button onClick={() => setPage('my-gacha')}>マイガチャ</button>
      </nav>
      {page === 'top' && <h1>Online Gacha Frontend</h1>}
      {page === 'gacha-list' && <UserGachaList />}
      {page === 'my-gacha' && <MyGachaList />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
