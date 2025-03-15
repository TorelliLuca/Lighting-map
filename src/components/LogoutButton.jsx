import { useNavigate } from 'react-router-dom'
import { useContext } from 'react'
const LogoutButton = (UserContext) => {
    const { userData, clearUserData } = useContext(UserContext);
    const navigate = useNavigate();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
  
    const handleLogout = () => {
        // Disable the button immediately via the UI
        const logoutButton = document.activeElement;
        if (logoutButton) logoutButton.disabled = true;
        
        // Clear user data
        clearUserData()
        
        // Navigate immediately instead of using setTimeout
        navigate("/", { replace: true })
      }
  
    return (
      <button 
        className="p-2 bg-red-900/20 hover:bg-red-800/30 text-red-400 rounded-lg border border-red-500/20 transition-colors duration-200"
        title="Logout"
        onClick={handleLogout}
        disabled={isLoggingOut}
      >
        <LogOut className="h-5 w-5" />
      </button>
    );
  };

export default LogoutButton;