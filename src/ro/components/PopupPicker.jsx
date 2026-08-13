import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, formatTime, toISODate } from '../utils/format.js';

function useClickOutside(refs, onClose) {
  useEffect(() => {
    const handler = (e) => {
      if (refs.some((r) => r.current && r.current.contains(e.target))) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

// Positions the popup below the field, flipping upward when space is short,
// and clamps it inside the viewport. Rendered via portal so the modal's
// overflow never clips it.
function usePopupPosition(anchorRef, open, popupHeight = 320, popupWidth = 306) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const gap = 6;
    const below = rect.bottom + gap;
    const flip = below + popupHeight > window.innerHeight - 8 && rect.top - gap - popupHeight > 8;
    const top = flip ? rect.top - gap - popupHeight : below;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popupWidth - 8));
    setPos({ position: 'fixed', top, left });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return pos;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// How many years into the future a booking may be made.
const FUTURE_YEARS = 2;

export function DatePopupField({ value, onSelect, invalid, placeholder = 'Select a date' }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const popupRef = useRef(null);
  useClickOutside([wrapRef, popupRef], () => setOpen(false));
  const pos = usePopupPosition(wrapRef, open, 330);
  const selected = value ? new Date(`${value}T00:00:00`) : null;
  const today = new Date();
  const todayISO = toISODate(today);
  const minY = today.getFullYear();
  const minM = today.getMonth();
  const maxY = minY + FUTURE_YEARS;
  const [cursor, setCursor] = useState(selected || today);

  useEffect(() => {
    if (open) setCursor(selected || today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const clampCursor = (c) => {
    let y = c.getFullYear();
    let m = c.getMonth();
    if (y < minY || (y === minY && m < minM)) {
      y = minY;
      m = minM;
    } else if (y > maxY) {
      y = maxY;
      m = 11;
    }
    return new Date(y, m, 1);
  };

  const moveMonth = (dir) =>
    setCursor((c) => clampCursor(new Date(c.getFullYear(), c.getMonth() + dir, 1)));

  const atMin = cursor.getFullYear() === minY && cursor.getMonth() === minM;
  const atMax = cursor.getFullYear() === maxY && cursor.getMonth() === 11;

  const goToday = () => {
    onSelect(todayISO);
    setOpen(false);
  };

  const firstOffset = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(firstOffset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const monthOptions = cursor.getFullYear() === minY ? MONTHS.slice(minM) : MONTHS;
  const yearOptions = Array.from({ length: FUTURE_YEARS + 1 }, (_, i) => minY + i);

  return (
    <div className="picker-field-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`picker-field${invalid ? ' is-invalid' : ''}${value ? ' has-value' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
      >
        <CalendarDays size={15} className="picker-field__icon" />
        <span className="picker-field__value">{value ? formatDate(value) : placeholder}</span>
      </button>

      {open &&
        createPortal(
          <div className="picker-popup picker-popup--date" ref={popupRef} style={pos}>
            <div className="picker-popup__head picker-popup__head--date">
              <button
                type="button"
                className="picker-nav"
                onClick={() => moveMonth(-1)}
                disabled={atMin}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="picker-popup__selects">
                <select
                  value={cursor.getMonth()}
                  aria-label="Month"
                  onChange={(e) =>
                    setCursor(clampCursor(new Date(cursor.getFullYear(), Number(e.target.value), 1)))
                  }
                >
                  {monthOptions.map((m, i) => (
                    <option key={m} value={cursor.getFullYear() === minY ? minM + i : i}>
                      {m}
                    </option>
                  ))}
                </select>
                <select
                  value={cursor.getFullYear()}
                  aria-label="Year"
                  onChange={(e) =>
                    setCursor(clampCursor(new Date(Number(e.target.value), cursor.getMonth(), 1)))
                  }
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="picker-nav"
                onClick={() => moveMonth(1)}
                disabled={atMax}
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="picker-weekdays">
              {WEEKDAYS.map((w) => <div key={w} className="picker-weekday">{w}</div>)}
            </div>

            <div className="picker-days">
              {cells.map((d, i) =>
                d === null ? (
                  <div key={`blank-${i}`} />
                ) : (
                  (() => {
                    const dayISO = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), d));
                    const isPast = dayISO < todayISO;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={isPast}
                        className={`picker-day${dayISO === todayISO ? ' is-today' : ''}${value === dayISO ? ' is-selected' : ''}${isPast ? ' is-muted' : ''}`}
                        onClick={() => {
                          onSelect(dayISO);
                          setOpen(false);
                        }}
                      >
                        {d}
                      </button>
                    );
                  })()
                )
              )}
            </div>

            <div className="picker-popup__foot">
              <button type="button" className="picker-ghost" onClick={goToday}>Today</button>
              {value && (
                <button
                  type="button"
                  className="picker-ghost picker-ghost--danger"
                  onClick={() => {
                    onSelect('');
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time dial — an analog clock face like the Android/Material time picker:
// tap or drag around the circle to set the hour or the minutes (5-min steps),
// switch between the two by tapping the number up top, AM/PM beside the face.
// ---------------------------------------------------------------------------

const HOUR_LABELS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const polar = (deg, r) => ({
  x: 118 + r * Math.sin((deg * Math.PI) / 180),
  y: 118 - r * Math.cos((deg * Math.PI) / 180),
});

function ClockDial({ mode, hour, minute, onHour, onMinute, onSwitchMinutes }) {
  const [dragging, setDragging] = useState(false);
  const dialRef = useRef(null);
  const downPos = useRef(null);

  // Projects a pointer position onto the circle and reports the nearest
  // hour (12 positions) or minute (1-minute precision).
  const apply = (px, py) => {
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = (Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI;
    angle = (angle + 360) % 360;
    if (mode === 'h') {
      const h = Math.round(angle / 30) % 12;
      onHour(h === 0 ? 12 : h);
    } else {
      const m = Math.round(angle / 6) % 60;
      onMinute(String(m).padStart(2, '0'));
    }
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) > rect.width / 2) return;
    dialRef.current.setPointerCapture(e.pointerId);
    downPos.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    apply(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    apply(e.clientX, e.clientY);
  };
  // A clean tap advances hour -> minute mode (like the Material picker);
  // a real drag keeps the current mode so the hand can be adjusted freely.
  const onPointerUp = (e) => {
    if (!dragging) return;
    setDragging(false);
    const moved = downPos.current && Math.hypot(e.clientX - downPos.current.x, e.clientY - downPos.current.y);
    downPos.current = null;
    if (moved < 8 && mode === 'h' && onSwitchMinutes) onSwitchMinutes();
  };

  const angleDeg = (mode === 'h' ? ((hour ?? 12) % 12) * 30 : Number(minute ?? '00') * 6) % 360;
  const tip = polar(angleDeg, 62);
  const selTick = polar(Number(minute ?? '00') * 6, 100);

  return (
    <div
      className="time-dial"
      ref={dialRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <svg viewBox="0 0 236 236">
        <circle cx="118" cy="118" r="116" fill="#f6f8fb" />
        <circle cx="118" cy="118" r="2.5" fill="#c7cdd8" />
        {mode === 'm' &&
          Array.from({ length: 60 }, (_, i) => {
            const p = polar(i * 6, 100);
            return <circle key={i} cx={p.x} cy={p.y} r={i % 5 === 0 ? 2.6 : 1.5} fill="#c7cdd8" />;
          })}
        {mode === 'm' &&
          Array.from({ length: 12 }, (_, i) => {
            const p = polar(i * 30, 88);
            const val = String(i * 5).padStart(2, '0');
            return (
              <text
                key={i}
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11.5"
                fontWeight={minute === val ? 700 : 500}
                fill={minute === val ? '#b45309' : '#344054'}
              >
                {val}
              </text>
            );
          })}
        {mode === 'm' && <circle cx={selTick.x} cy={selTick.y} r="3.4" fill="#f59e0b" />}
        <line x1="118" y1="118" x2={tip.x} y2={tip.y} stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={tip.x} cy={tip.y} r="9" fill="#f59e0b" />
      </svg>
      {mode === 'h' &&
        HOUR_LABELS.map((n, i) => (
          <button
            key={n}
            type="button"
            tabIndex={-1}
            className={`time-dial__num${hour === n ? ' is-selected' : ''}`}
            style={{ transform: `rotate(${i * 30}deg) translateY(-88px) rotate(${-i * 30}deg)` }}
          >
            {n}
          </button>
        ))}
    </div>
  );
}

export function TimePopupField({ value, onSelect, invalid, placeholder = 'Select a time' }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('h');
  const wrapRef = useRef(null);
  const popupRef = useRef(null);
  useClickOutside([wrapRef, popupRef], () => setOpen(false));
  const pos = usePopupPosition(wrapRef, open, 350, 350);
  const [ampm, setAmpm] = useState('AM');

  const hour24 = value ? Number(value.slice(0, 2)) : null;
  const minute = value ? value.slice(3, 5) : null;
  const hour = hour24 === null ? null : (hour24 % 12) || 12;

  useEffect(() => {
    if (open) {
      const h = value ? Number(value.slice(0, 2)) : new Date().getHours();
      setAmpm(h < 12 ? 'AM' : 'PM');
      setMode('h');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const compose = (h, m, ap) => {
    const h24 = ap === 'PM' ? (h % 12) + 12 : h % 12;
    return `${String(h24).padStart(2, '0')}:${m}`;
  };

  const pickHour = (h) => onSelect(compose(h, minute ?? '00', ampm));
  const pickMinute = (m) => onSelect(compose(hour ?? 12, m, ampm));
  const onAmpm = (ap) => {
    setAmpm(ap);
    onSelect(compose(hour ?? 12, minute ?? '00', ap));
  };

  const pickNow = () => {
    const d = new Date();
    const rawMin = Math.round(d.getMinutes() / 5) * 5;
    const m = rawMin >= 60 ? 0 : rawMin;
    let h = rawMin >= 60 ? d.getHours() + 1 : d.getHours();
    if (h === 24) h = 0;
    onSelect(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <div className="picker-field-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`picker-field${invalid ? ' is-invalid' : ''}${value ? ' has-value' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
      >
        <Clock size={15} className="picker-field__icon" />
        <span className="picker-field__value">{value ? formatTime(value) : placeholder}</span>
      </button>

      {open &&
        createPortal(
          <div className="picker-popup picker-popup--time" ref={popupRef} style={pos}>
            <div className="time-display">
              <button
                type="button"
                className={mode === 'h' ? 'is-active' : ''}
                onClick={() => setMode('h')}
              >
                {hour ?? '--'}
              </button>
              <span className="time-display__colon">:</span>
              <button
                type="button"
                className={mode === 'm' ? 'is-active' : ''}
                onClick={() => setMode('m')}
              >
                {minute ?? '--'}
              </button>
            </div>

            <div className="time-dial-row">
              <ClockDial mode={mode} hour={hour} minute={minute} onHour={pickHour} onMinute={pickMinute} onSwitchMinutes={() => setMode('m')} />
              <div className="time-ampm">
                {['AM', 'PM'].map((ap) => (
                  <button
                    key={ap}
                    type="button"
                    className={`time-ampm__btn${ampm === ap ? ' is-active' : ''}`}
                    onClick={() => onAmpm(ap)}
                  >
                    {ap}
                  </button>
                ))}
              </div>
            </div>

            <div className="picker-popup__foot">
              <div className="picker-popup__foot-start">
                <button type="button" className="picker-ghost" onClick={pickNow}>Now</button>
                <button type="button" className="picker-ghost picker-ghost--done" onClick={() => setOpen(false)}>Done</button>
              </div>
              {value && (
                <button
                  type="button"
                  className="picker-ghost picker-ghost--danger"
                  onClick={() => {
                    onSelect('');
                    setOpen(false);
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
