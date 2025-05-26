import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../config/supabase';
import Swal from 'sweetalert2';

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showVerifyMsg, setShowVerifyMsg] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const validateForm = useCallback(() => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Correo electrónico inválido';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  useEffect(() => {
    validateForm();
    setPasswordStrength(calculatePasswordStrength(formData.password));
  }, [formData, validateForm]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    document.title = 'Registro - Planeat';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: import.meta.env.PROD 
            ? 'https://planeat.up.railway.app/auth/callback'
            : `${window.location.origin}/auth/callback`
        }
      });
      if (error) {
        if (error.message && error.message.toLowerCase().includes('user already registered')) {
          setError('Este correo ya está registrado. Intenta iniciar sesión o usa otro correo.');
        } else if (error.message && error.message.toLowerCase().includes('duplicate key value')) {
          setError('Este correo ya está registrado. Intenta iniciar sesión o usa otro correo.');
        } else {
          setError(error.message || 'Error al registrar');
        }
        setLoading(false);
        return;
      }
      setShowVerifyMsg(true);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al registrar');
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendSuccess(null);
    setResendError(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email
      });
      if (error) throw error;
      setResendSuccess('Correo de confirmación reenviado. Revisa tu bandeja de entrada.');
      setResendCooldown(30);
    } catch (err: any) {
      setResendError(err?.message || 'No se pudo reenviar el correo. Intenta de nuevo más tarde.');
    } finally {
      setResendLoading(false);
    }
  };

  if (showVerifyMsg) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300">
        <div className="max-w-md w-full mx-auto mt-16 px-4">
          <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <h2 className="text-2xl font-bold text-green-700 mb-4 text-center">¡Registro exitoso!</h2>
            <p className="mb-2 text-secondary-700 dark:text-secondary-200">Para continuar, revisa tu correo y <b>confirma tu cuenta</b> desde el enlace que te hemos enviado.</p>
            <p className="mb-4 text-sm text-secondary-600 dark:text-secondary-300">No podrás iniciar sesión hasta que confirmes tu correo electrónico.</p>
            <button
              className="mt-2 px-4 py-2 text-sm text-secondary-500 hover:underline"
              onClick={async () => {
                await Swal.fire({
                  title: 'Cerrar página',
                  text: 'Puedes cerrar la pestaña manualmente si no se cierra automáticamente.',
                  icon: 'info',
                  confirmButtonText: 'Aceptar',
                  confirmButtonColor: '#22c55e',
                });
                window.close();
              }}
            >
              Cerrar esta página
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100/60 via-green-200/40 to-secondary-900/80 dark:from-secondary-900 dark:via-secondary-800 dark:to-secondary-900 transition-colors duration-300">
      <div className="flex flex-col items-center justify-center py-8 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-80px)]">
        <div className="w-full max-w-md mx-auto flex flex-col items-center">
          <div className="w-full bg-white dark:bg-secondary-800 p-8 rounded-2xl shadow-2xl flex flex-col items-center">
            <h2 className="text-3xl font-extrabold text-secondary-900 dark:text-white mb-2 text-center">Crea tu cuenta</h2>
            <p className="text-sm text-secondary-600 dark:text-secondary-300 mb-6 text-center">
              O{' '}
              <Link to="/login" className="font-medium text-green-600 hover:text-green-500">
                inicia sesión si ya tienes una cuenta
              </Link>
            </p>

            <form className="w-full space-y-5" onSubmit={handleSubmit} autoComplete="on">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 sr-only">
                  Correo electrónico
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Correo electrónico"
                  value={formData.email}
                  onChange={handleChange}
                />
                {errors.email && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 sr-only">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Contraseña"
                  value={formData.password}
                  onChange={handleChange}
                />
                {errors.password && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-900 dark:text-secondary-100 sr-only">
                  Confirmar contraseña
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 dark:border-secondary-600 placeholder-gray-500 dark:placeholder-secondary-400 text-secondary-900 dark:text-secondary-100 bg-white dark:bg-secondary-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-base shadow-sm"
                  placeholder="Repite la contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                {errors.confirmPassword && <p className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-bold text-lg bg-green-600 hover:bg-green-700 text-white shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Registrando...' : 'Registrarse'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 