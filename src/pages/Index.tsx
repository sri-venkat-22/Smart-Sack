import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Cpu, Eye, Zap, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FloatingBoxesCanvas } from '@/components/three/FloatingBoxes';
import { MagneticButton } from '@/components/MagneticButton';
import { FeatureCard } from '@/components/FeatureCard';
import { Navbar } from '@/components/Navbar';

const features = [
  {
    icon: Cpu,
    title: 'Real Algorithm Backend',
    description: 'Powered by advanced bin-packing algorithms running on FastAPI. No simulations — real optimization in real-time.',
  },
  {
    icon: Eye,
    title: 'Interactive 3D Visualization',
    description: 'Explore your packed bins in immersive 3D. Hover, click, and rotate to inspect every item placement.',
  },
  {
    icon: Zap,
    title: 'Optimization & Efficiency',
    description: 'Maximize space utilization with intelligent packing strategies. See efficiency metrics at a glance.',
  },
];

export default function Index() {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Navbar />
      
      {/* Hero Section */}
      <motion.section 
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center px-6"
      >
        <FloatingBoxesCanvas />
        
        {/* Hero glow effect */}
        <div className="absolute inset-0 hero-gradient pointer-events-none" />
        
        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-panel text-sm text-muted-foreground mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              3D Bin Packing Visualization
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-5xl md:text-7xl font-bold leading-tight mb-6"
          >
            Visualize 3D Bin Packing{' '}
            <span className="gradient-text">Like Never Before</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12"
          >
            An interactive 3D platform to optimize packing efficiency using real algorithms. 
            Experience spatial optimization in a whole new dimension.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/workspace">
              <MagneticButton variant="hero" size="xl" className="group">
                Launch 3D Workspace
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
            </Link>
            
            <MagneticButton 
              variant="heroSecondary" 
              size="xl"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              How It Works
            </MagneticButton>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="text-muted-foreground"
          >
            <ChevronDown className="w-6 h-6" />
          </motion.div>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for professional-grade 3D bin packing visualization
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={feature.title} {...feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="glass-panel p-12 md:p-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to optimize your packing?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Experience the future of 3D bin packing visualization.
            </p>
            <Link to="/workspace">
              <MagneticButton variant="glow" size="xl" className="group">
                Get Started Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </MagneticButton>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2024 Pack3D. Visualize. Optimize. Pack in 3D.
          </p>
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">
              Powered by advanced algorithms
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
