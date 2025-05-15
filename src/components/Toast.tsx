import { Fragment, useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface ToastProps {
  message: {
    type: 'success' | 'error' | 'info';
    title: string;
    description: string;
  };
  onClose: () => void;
}

const Toast = ({ message, onClose }: ToastProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300); // Esperar a que termine la animación
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
    error: <XCircleIcon className="h-6 w-6 text-red-400" />,
    info: <InformationCircleIcon className="h-6 w-6 text-blue-400" />
  };

  const colors = {
    success: 'bg-green-50 text-green-800',
    error: 'bg-red-50 text-red-800',
    info: 'bg-blue-50 text-blue-800'
  };

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-50"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        <Transition
          show={show}
          as={Fragment}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
          enterTo="translate-y-0 opacity-100 sm:translate-x-0"
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className={`pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 ${colors[message.type]}`}>
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {icons[message.type]}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium">{message.title}</p>
                  <p className="mt-1 text-sm opacity-90">{message.description}</p>
                </div>
                <div className="ml-4 flex flex-shrink-0">
                  <button
                    type="button"
                    className="inline-flex rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
                    onClick={() => {
                      setShow(false);
                      setTimeout(onClose, 300);
                    }}
                  >
                    <span className="sr-only">Cerrar</span>
                    <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
};

export default Toast; 