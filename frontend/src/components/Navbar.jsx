import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { BarChart3, LogOut, MessageSquare, Settings, User, Compass, Newspaper } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();

  return (
    <header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg bg-base-100/80">
      <div className="container mx-auto px-3 sm:px-4 h-16">
        <div className="flex items-center justify-between h-full gap-2">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-all shrink-0">
            <div className="size-8 sm:size-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
            <h1 className="text-base sm:text-lg font-bold">Chatty</h1>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <Link to="/settings" className="btn btn-ghost btn-sm gap-1.5 px-2 sm:px-3 shrink-0">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">Settings</span>
            </Link>

            {authUser && (
              <>
                <Link to="/explore" className="btn btn-ghost btn-sm gap-1.5 px-2 sm:px-3 shrink-0">
                  <Compass className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Explore</span>
                </Link>

                <Link to="/feed" className="btn btn-ghost btn-sm gap-1.5 px-2 sm:px-3 shrink-0">
                  <Newspaper className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Feed</span>
                </Link>

                <Link to="/analytics" className="hidden xs:flex btn btn-ghost btn-sm gap-1.5 px-2 sm:px-3 shrink-0">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Analytics</span>
                </Link>

                <Link to="/profile" className="btn btn-ghost btn-sm gap-1.5 px-2 sm:px-3 shrink-0">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Profile</span>
                </Link>

                <button
                  onClick={logout}
                  className="btn btn-ghost btn-sm gap-1.5 px-2 sm:px-3 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline text-sm">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
export default Navbar;

