import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen text-center">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              TerraMail
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Sistema de gerenciamento de usuários e assinaturas
            </p>
            <p className="text-lg text-gray-500 mb-12">
              Gerencie usuários, planos de assinatura e controle de acesso de forma simples e eficiente.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link
                  to="/dashboard"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
                >
                  Ir para Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
                  >
                    Fazer Login
                  </Link>
                  <Link
                    to="/admin-login"
                    className="bg-gray-600 hover:bg-gray-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
                  >
                    Login Admin
                  </Link>
                </>
              )}
            </div>

            {user && (
              <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
                <p className="text-sm text-gray-600">
                  Logado como: <span className="font-medium">{user.email}</span>
                </p>
                {user.subscription_days > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {user.subscription_days} dias de assinatura restantes
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}