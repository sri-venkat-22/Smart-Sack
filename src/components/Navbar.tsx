import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const location = useLocation();
  const isWorkspace = location.pathname === '/workspace';

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between glass-panel px-6 py-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Box className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold">Pack3D</span>
          </Link>

          <div className="flex items-center gap-4">
            {!isWorkspace ? (
              <Link to="/workspace">
                <Button variant="hero" size="default" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Launch Workspace
                </Button>
              </Link>
            ) : (
              <Link to="/">
                <Button variant="glass" size="default">
                  Back to Home
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
