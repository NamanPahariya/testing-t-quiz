/*

MY CODE IS HERE

import React, { useState, useEffect } from 'react';
import { ArrowRight, Brain, Trophy, Users, Sparkles, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import img from '../../assets/know2.svg'
const LandingPage = () => {
  const navigate = useNavigate();

 

  return (
    <div className="h-screen bg-gradient-to-br from-indigo-100 to-white flex flex-col">
      <header className={`px-8 py-4 opacity-0`}
           style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
        <h1 className="text-2xl font-bold text-indigo-600">TelusQ</h1>
      </header>

      <div className="flex-1 flex">
        <div className="w-1/2 flex flex-col justify-center px-8 space-y-6">
          <h2 className="text-5xl font-extrabold text-gray-900 leading-tight opacity-0 translate-y-4"
              style={{ animation: 'slideUpFade 0.8s ease-out 0.2s forwards' }}>
            <span className="block">Test Your Knowledge,</span>
            <span className="text-indigo-600 block opacity-0"
                  style={{ animation: 'slideUpFade 0.8s ease-out 0.6s forwards' }}>
              Challenge Your Mind
            </span>
          </h2>
          <p className="text-lg text-gray-600 opacity-0"
             style={{ animation: 'slideUpFade 0.8s ease-out 1s forwards' }}>
            Join thousands of learners in our interactive quiz platform.
            Challenge yourself and learn something new every day.
          </p>
          <button className="group flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-full text-lg font-semibold hover:bg-indigo-700 transition-all transform hover:scale-105 w-fit opacity-0"
                  style={{ animation: 'slideUpFade 0.8s ease-out 1.2s forwards' }} onClick={()=>navigate('/home')}>
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="flex gap-8 mt-8">
            {[
              { icon: Brain, text: "Learn Faster", delay: "1.4s" },
              { icon: Trophy, text: "Compete & Win", delay: "1.6s" },
              { icon: Users, text: "Community", delay: "1.8s" }
            ].map((feature, index) => (
              <div key={index} 
                   className="flex items-center gap-2 opacity-0"
                   style={{ animation: `slideUpFade 0.8s ease-out ${feature.delay} forwards` }}>
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <span className="font-medium">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-1/2 p-8 flex items-center">
          <div className="w-full h-4/5 bg-indigo-200 rounded-2xl overflow-hidden relative hover:shadow-2xl transition-shadow opacity-0"
               style={{ animation: 'scaleIn 1s ease-out 0.5s forwards' }}>
            <img
              src={img}
              alt="Quiz illustration"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-8 right-8 p-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg opacity-0 border-l-4 border-indigo-600"
                 style={{ animation: 'slideInRight 0.8s ease-out 1.4s forwards' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-600" />
                <div>
                  <div className="font-bold text-gray-800">Daily Challenges</div>
                  <div className="text-sm text-gray-600">Train Your Brain Daily</div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-8 left-8 p-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg opacity-0 border-l-4 border-indigo-600"
                 style={{ animation: 'slideInLeft 0.8s ease-out 1.6s forwards' }}>
              <div className="flex items-center gap-2">
                <Zap className="w-6 h-6 text-indigo-600" />
                <div>
                  <div className="font-bold text-gray-800">Instant Results</div>
                  <div className="text-sm text-gray-600">Track Your Progress</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUpFade {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
*/



import React from 'react';
import { Brain, Zap, Users, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 font-sans">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-8">
        <nav className="flex items-center justify-between mb-32">
          <div className="flex items-center space-x-2">
            <Zap className="w-8 h-8 text-lime-400" />
            <span className="text-2xl font-black text-white tracking-tight">TelusQ</span>
          </div>
        </nav>

        <div className="text-center max-w-5xl mx-auto mb-24">
          <h1 className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight tracking-tighter">
            YOUR QUIZ APP IS ABOUT TO GET FASTER
          </h1>
          <p className="text-2xl text-gray-300 mb-12 font-light">
            Create and deliver <span className="text-lime-400 font-medium">real-time quizzes</span> with instant feedback and live leaderboards.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              className="bg-lime-400 text-gray-900 px-8 py-4 rounded-lg font-extrabold tracking-wide hover:bg-lime-300 transition-colors text-lg"
              onClick={() => navigate('/home')}
            >
              Start Creating <ArrowRight className="inline ml-2" />
            </button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="bg-gray-800 py-24">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-8 rounded-xl border border-gray-700">
              <Zap className="w-12 h-12 text-lime-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4 tracking-wide">Real-time Interaction</h3>
              <p className="text-gray-400 font-light">Instant feedback and live results as participants answer questions.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-xl border border-gray-700">
              <Users className="w-12 h-12 text-lime-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4 tracking-wide">Live Leaderboards</h3>
              <p className="text-gray-400 font-light">Dynamic rankings update in real-time as scores change.</p>
            </div>
            <div className="bg-gray-900 p-8 rounded-xl border border-gray-700">
              <Trophy className="w-12 h-12 text-lime-400 mb-6" />
              <h3 className="text-xl font-bold text-white mb-4 tracking-wide">Instant Analytics</h3>
              <p className="text-gray-400 font-light">Get immediate insights into participant performance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-lime-400 py-20">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tight">
            Ready to Transform Your Quizzes?
          </h2>
          <p className="text-xl text-gray-700 mb-8 font-light">
            Join thousands of educators delivering engaging real-time quizzes
          </p>
          <button className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors text-lg font-extrabold tracking-wide">
            Get Started Free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <Zap className="w-6 h-6 text-lime-400" />
                <span className="text-xl font-black text-white tracking-tight">TelusQ</span>
              </div>
              <p className="font-light">Real-time quiz platform for modern education.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;