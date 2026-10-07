import { useState } from 'react';
import { Icon } from '../ui/Icon';

export default function ExamUploadDropzone({
  title = 'Dosyayı seçin veya buraya bırakın',
  hint,
  formats = [],
  extensions = [],
  disabled = false,
  onFile,
}) {
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState(null);

  function acceptFile(file) {
    if (!file) return;
    const allowed = !extensions.length || extensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!allowed) {
      setRejected(`«${file.name}» desteklenmiyor. Desteklenen türler: ${extensions.join(', ')}`);
      return;
    }
    setRejected(null);
    onFile(file);
  }

  return (
    <div className="exam-upload">
      <label
        className={`exam-upload-drop${over ? ' exam-upload-drop--over' : ''}${disabled ? ' exam-upload-drop--disabled' : ''}`}
        onDragOver={(event) => {
          if (disabled) return;
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (!disabled) acceptFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          className="exam-upload-drop__input"
          type="file"
          accept={extensions.join(',')}
          disabled={disabled}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            acceptFile(file);
          }}
        />
        <span className="exam-upload-drop__icon" aria-hidden="true">
          <Icon name="file" size={22} />
        </span>
        <span className="exam-upload-drop__title">{title}</span>
        {formats.length ? (
          <span className="exam-upload-drop__formats">
            {formats.map((format) => (
              <span key={format} className="exam-upload-drop__chip">
                {format}
              </span>
            ))}
          </span>
        ) : null}
        <span className="exam-upload-drop__button demo-btn">Dosya seç</span>
      </label>
      {hint ? <p className="exam-upload__hint">{hint}</p> : null}
      {rejected ? (
        <p className="exam-upload__error" role="alert">
          {rejected}
        </p>
      ) : null}
    </div>
  );
}
