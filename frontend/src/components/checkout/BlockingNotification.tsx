import { Modal, Button } from 'react-bootstrap';
import React, { useEffect, useRef } from 'react';

import { useCheckout, BlockingNotificationType } from '../../context/CheckoutContext';

const notificationStyles: Record<
  BlockingNotificationType,
  {
    bgColor: string;
    buttonColor: string;
    textColor: string;
    icon: string;
  }
> = {
  error: {
    bgColor: '#ffe5e3',
    buttonColor: '#34ad61',
    textColor: '#ba291c',
    icon: '/assets/icons/glass/circle-x.svg',
  },
  warning: {
    bgColor: '#fccd4c',
    buttonColor: '#34ad61',
    textColor: '#713f12',
    icon: '/assets/icons/glass/warning.svg',
  },
};

const BlockingNotification: React.FC = () => {
  const { blockingNotification, dismissBlockingNotification } = useCheckout();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (blockingNotification) {
      // Toca o som de erro
      if (!audioRef.current) {
        audioRef.current = new Audio('/assets/sounds/beep-error.mp3');
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => console.warn('Erro ao tocar som:', err));
    }
  }, [blockingNotification]);

  if (!blockingNotification) return null;

  const style = notificationStyles[blockingNotification.type];

  return (
    <Modal
      show={!!blockingNotification}
      onHide={() => { }}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="meu-modal-custom6"
    >
      <Modal.Body className="text-center p-4" style={{ backgroundColor: style.bgColor }}>
        {/* SVG */}
        <div className="mb-3">
          <img src={style.icon} alt="Notificação" style={{ width: '60px', height: '60px' }} />
        </div>

        {/* Texto */}
        <p className="mb-4" style={{ color: style.textColor, fontSize: '1rem' }}>
          {blockingNotification.message}
        </p>

        {/* Botão */}
        <Button
          size="sm"
          onClick={dismissBlockingNotification}
          className="px-4"
          style={{
            backgroundColor: style.buttonColor,
            borderColor: style.buttonColor,
            color: '#ffffff',
          }}
        >
          Confirmar
        </Button>
      </Modal.Body>
    </Modal>
  );
};

export default BlockingNotification;
