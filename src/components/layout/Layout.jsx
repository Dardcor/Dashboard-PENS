import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="page-container" style={{ marginLeft: '260px' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
