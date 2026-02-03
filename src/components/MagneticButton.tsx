import React from 'react';
import { motion } from 'framer-motion';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useMagneticHover } from '@/hooks/useMouse';

interface MagneticButtonProps extends ButtonProps {
  magneticStrength?: number;
}

export function MagneticButton({ 
  children, 
  magneticStrength = 0.25,
  ...props 
}: MagneticButtonProps) {
  const { offset, handlers } = useMagneticHover(magneticStrength);

  return (
    <motion.div
      animate={{ x: offset.x, y: offset.y }}
      transition={{ type: 'spring', stiffness: 350, damping: 20 }}
      {...handlers}
    >
      <Button {...props}>
        {children}
      </Button>
    </motion.div>
  );
}
