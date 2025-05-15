import React from "react";
import { Link } from "wouter";
import { ArrowLeft, Construction } from "lucide-react";
import AIcrmLogo from "@/components/logo/AIcrmLogo";
import { BrandGradient } from "@/components/ui/brand-gradient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const Contact: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white py-4 px-6 border-b border-slate-200">
        <div className="container mx-auto flex justify-between items-center">
          <Link href="/">
            <a className="flex items-center">
              <AIcrmLogo width={180} height={60} />
            </a>
          </Link>
          <div className="flex items-center space-x-6">
            <Link href="/features" className="text-slate-600 hover:text-[#0082AE] font-medium">Features</Link>
            <Link href="/pricing" className="text-slate-600 hover:text-[#0082AE] font-medium">Pricing</Link>
            <Link href="/contact" className="text-[#0082AE] font-medium">Contact</Link>
            <Link href="/auth">
              <Button variant="outline" className="ml-4">
                Log In
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <BrandGradient className="py-16 text-white">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Contact Us
          </h1>
          <p className="text-xl max-w-3xl mx-auto mb-8 text-white/90">
            We're here to help with any questions you might have about our platform.
          </p>
          <Link href="/">
            <Button variant="secondary" className="px-6">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
            </Button>
          </Link>
        </div>
      </BrandGradient>

      {/* Coming Soon */}
      <section className="py-24 bg-slate-50 flex-grow">
        <div className="container mx-auto px-6">
          <Card className="max-w-2xl mx-auto shadow-lg">
            <CardContent className="p-12 text-center">
              <Construction className="mx-auto h-20 w-20 text-[#0082AE] mb-6" />
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Functionality Being Built</h2>
              <p className="text-xl text-slate-600 mb-8">
                Our contact page is currently under construction. We're working hard to bring you a seamless way to get in touch with our team.
              </p>
              <p className="text-slate-600 mb-6">
                In the meantime, you can explore our features and sign up for free to experience our AI-powered CRM platform.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/features">
                  <Button variant="outline" className="px-6">
                    Explore Features
                  </Button>
                </Link>
                <Link href="/auth?tab=register">
                  <Button className="px-6">
                    Try it FREE
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <AIcrmLogo width={150} height={50} />
              <p className="mt-2 text-slate-400">The CRM Built for Humans, Powered by AI</p>
            </div>
            <div className="flex space-x-8">
              <Link href="/features" className="text-white hover:text-[#0082AE]">Features</Link>
              <Link href="/pricing" className="text-white hover:text-[#0082AE]">Pricing</Link>
              <Link href="/contact" className="text-white hover:text-[#0082AE]">Contact</Link>
            </div>
          </div>
          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-slate-400">
            <p>© {new Date().getFullYear()} AI-CRM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Contact;