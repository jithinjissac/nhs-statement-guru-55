
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { FileUp, FileText, Shield, Settings, Check } from 'lucide-react';

const MotionCard = motion(Card);

const Index: React.FC = () => {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900 z-0"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 z-0"></div>
        
        <div className="container relative z-10">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-6 text-center md:text-left">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-block"
              >
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  NHS Application Specialist
                </span>
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-balance"
              >
                Create Human-like <br className="hidden md:inline" />
                <span className="text-gradient">NHS Supporting Statements</span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-muted-foreground max-w-xl mx-auto md:mx-0"
              >
                Upload your CV and job description to generate tailored, authentic supporting statements that pass AI detection tools.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start"
              >
                <Button asChild size="lg" className="text-md font-medium">
                  <Link to="/create">Get Started</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-md font-medium">
                  <Link to="/about">Learn More</Link>
                </Button>
              </motion.div>
            </div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative"
            >
              <div className="relative mx-auto max-w-lg lg:mr-0">
                <div className="absolute inset-0 scale-[0.85] rounded-3xl bg-gradient-to-br from-blue-500 to-blue-600 blur-3xl opacity-20 dark:from-blue-400 dark:to-blue-600 dark:opacity-30"></div>
                <div className="relative rounded-xl overflow-hidden shadow-2xl border border-white/20 dark:border-white/5">
                  <img 
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80" 
                    alt="NHS Professional Workspace" 
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Features */}
      <section className="py-16 md:py-24 bg-white dark:bg-gray-950">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Craft Perfect Supporting Statements
            </h2>
            <p className="text-lg text-muted-foreground">
              Our intelligent system analyzes your CV and the job description to create tailored, human-like content that resonates with NHS recruiters.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <FileUp className="h-8 w-8 text-blue-600" />,
                title: "Upload Your Documents",
                description: "Simply upload your CV and the NHS job description. Our system will analyze both to understand your experience and the role requirements."
              },
              {
                icon: <FileText className="h-8 w-8 text-blue-600" />,
                title: "Generate Your Statement",
                description: "Our advanced AI creates a tailored supporting statement that highlights your relevant experience for the specific NHS role."
              },
              {
                icon: <Shield className="h-8 w-8 text-blue-600" />,
                title: "Bypass AI Detection",
                description: "Our humanization technology ensures your statement reads naturally and passes through AI detection tools undetected."
              },
              {
                icon: <Settings className="h-8 w-8 text-blue-600" />,
                title: "Customize & Refine",
                description: "Easily edit and refine your statement to add personal touches and ensure it perfectly represents your professional voice."
              },
              {
                icon: <Check className="h-8 w-8 text-blue-600" />,
                title: "Verification Tools",
                description: "Test your final statement against multiple AI detection tools directly within our platform to ensure it appears human-written."
              },
              {
                icon: <FileText className="h-8 w-8 text-blue-600" />,
                title: "Expert Guidelines",
                description: "Access NHS-specific guidelines and samples that ensure your statement follows best practices for healthcare applications."
              }
            ].map((feature, i) => (
              <MotionCard 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="hover-lift"
              >
                <CardContent className="p-6 space-y-4">
                  <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3 w-fit">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </MotionCard>
            ))}
          </div>
        </div>
      </section>
      
      {/* How It Works */}
      <section className="py-16 md:py-24 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground">
              Our streamlined process takes you from documents to a polished NHS supporting statement in minutes.
            </p>
          </div>
          
          <div className="relative max-w-4xl mx-auto">
            {/* Connection Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-blue-200 dark:bg-blue-900 -translate-x-1/2 hidden md:block"></div>
            
            {/* Steps */}
            {[
              {
                number: "01",
                title: "Upload Documents",
                description: "Upload your CV and the NHS job description PDF or DOCX files."
              },
              {
                number: "02",
                title: "AI Analysis",
                description: "Our system analyzes both documents to identify key skills, experiences, and requirements."
              },
              {
                number: "03",
                title: "Generate Statement",
                description: "A human-like supporting statement is created based on the analysis."
              },
              {
                number: "04",
                title: "Edit & Refine",
                description: "Review, edit, and customize your statement to add personal touches."
              },
              {
                number: "05",
                title: "Test & Verify",
                description: "Check if your statement passes AI detection tools."
              },
              {
                number: "06",
                title: "Download & Submit",
                description: "Download your final statement ready for your NHS application."
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`flex items-start gap-4 md:gap-8 mb-12 md:mb-16 ${
                  i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse text-right'
                }`}
              >
                <div className={`relative flex-shrink-0 flex items-center justify-center z-10 ${
                  i % 2 === 0 ? 'md:mr-8' : 'md:ml-8'
                }`}>
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center border-2 border-blue-500 text-blue-600 dark:text-blue-400 font-bold">
                    {step.number}
                  </div>
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="py-16 md:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 z-0"></div>
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center opacity-5 z-0"></div>
        
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-3xl font-bold tracking-tight sm:text-4xl mb-6"
            >
              Ready to create your winning <br />
              NHS supporting statement?
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="text-xl text-muted-foreground mb-8"
            >
              Join thousands of healthcare professionals who have successfully secured NHS roles with our help.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button asChild size="lg" className="text-md font-medium">
                <Link to="/create">Create Your Statement</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-md font-medium">
                <Link to="/examples">View Examples</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
