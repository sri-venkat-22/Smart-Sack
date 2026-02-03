import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration: 0.6, 
        delay: index * 0.15,
        ease: [0.21, 0.47, 0.32, 0.98]
      }}
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      className="glass-panel p-8 group cursor-default"
    >
      <div className="mb-6 inline-flex p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
        <Icon className="w-6 h-6" />
      </div>
      
      <h3 className="text-xl font-semibold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
        {title}
      </h3>
      
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
      
      <div className="mt-6 h-px w-0 group-hover:w-full bg-gradient-to-r from-primary/50 to-transparent transition-all duration-500" />
    </motion.div>
  );
}
