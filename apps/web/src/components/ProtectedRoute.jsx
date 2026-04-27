import { Navigate } from 'react-router-dom';
import { loadAuthSession } from '../lib/auth';

function ProtectedRoute({ children }) {
  const session = loadAuthSession();
  if (!session?.accessToken) return <Navigate to="/login" replace />;
  return children;
}

export default ProtectedRoute;
