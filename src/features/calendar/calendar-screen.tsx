'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarMonth, CalendarViewModel } from '@/src/lib/calendar-types';

const WEEK_DAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function CalendarScreen({
  onBack,
  data,
}: {
  onBack: () => void;
  data: CalendarViewModel;
}) {
  const initialIndex = Math.max(0, data.months.findIndex((month) => month.key === data.initialMonthKey));
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const currentMonth = data.months[currentIndex];
  const nextDisabled = currentIndex >= data.months.length - 1;
  const prevDisabled = currentIndex <= 0;

  useEffect(() => {
    setSelectedDay(null);
  }, [currentIndex]);

  const gridDays = useMemo(() => {
    const leading = Array.from({ length: currentMonth.firstWeekday }, (_, index) => ({ key: `empty-${index}`, day: null }));
    const days = Array.from({ length: currentMonth.daysInMonth }, (_, index) => ({ key: `day-${index + 1}`, day: index + 1 }));
    return [...leading, ...days];
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarMonth['events']>();
    for (const event of currentMonth.events) {
      const bucket = map.get(event.day) ?? [];
      bucket.push(event);
      map.set(event.day, bucket);
    }
    return map;
  }, [currentMonth]);

  const visibleEvents = useMemo(() => {
    if (!selectedDay) return currentMonth.events;
    return currentMonth.events.filter((event) => event.day === selectedDay);
  }, [currentMonth.events, selectedDay]);

  return (
    <div className="space-y-6">
      <header className="flex items-center space-x-4">
        <button onClick={onBack} className="text-arca-text-dim hover:text-arca-accent transition-colors">
          <ArrowDownLeft className="rotate-45" size={24} />
        </button>
        <h2 className="text-lg font-bold text-arca-text-primary uppercase tracking-widest">Calendario</h2>
      </header>

      <section className="card-arca p-5">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-bold text-arca-text-primary capitalize">{currentMonth.label}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => !prevDisabled && setCurrentIndex((value) => value - 1)}
              disabled={prevDisabled}
              className="p-2 text-arca-text-dim hover:text-arca-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => !nextDisabled && setCurrentIndex((value) => value + 1)}
              disabled={nextDisabled}
              className="p-2 text-arca-text-dim hover:text-arca-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="text-center text-[10px] font-bold text-arca-text-dim uppercase tracking-widest mb-2">
              {day}
            </div>
          ))}
          {gridDays.map((cell) => {
            if (!cell.day) {
              return <div key={cell.key} className="aspect-square" />;
            }

            const dayEvents = eventsByDay.get(cell.day) ?? [];
            const isToday = currentMonth.key === data.initialMonthKey && cell.day === Number(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }).slice(8, 10));
            const tone =
              dayEvents.some((event) => event.status === 'overdue')
                ? 'bg-arca-alert'
                : dayEvents.some((event) => event.kind === 'income' || event.kind === 'receivable')
                  ? 'bg-arca-positive'
                  : 'bg-arca-accent';

            return (
              <motion.button
                key={cell.key}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => setSelectedDay(cell.day)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center relative border border-arca-border ${
                  selectedDay === cell.day
                    ? 'bg-arca-accent/15 text-arca-accent border-arca-accent/30'
                    : isToday
                      ? 'bg-arca-accent text-white shadow-lg shadow-arca-accent/20'
                      : 'bg-arca-surface-2 text-arca-text-dim'
                }`}
              >
                <span className="text-xs font-bold">{cell.day}</span>
                {dayEvents.length > 0 && !isToday && <div className={`w-1.5 h-1.5 rounded-full absolute bottom-2 ${tone}`} />}
                {dayEvents.length > 1 && !isToday && (
                  <span className="absolute top-1 right-1 text-[8px] font-bold text-arca-text-dim">{dayEvents.length}</span>
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-bold text-arca-text-dim uppercase tracking-widest">
            {selectedDay ? `Agenda del ${selectedDay}` : 'Agenda del mes'}
          </h3>
          {selectedDay ? (
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[10px] font-bold uppercase tracking-widest text-arca-accent"
            >
              Ver todo
            </button>
          ) : null}
        </div>
        <div className="card-arca divide-y divide-arca-border overflow-hidden">
          {visibleEvents.length > 0 ? (
            visibleEvents.map((event) => (
              <div key={`${event.kind}-${event.id}`} className="flex items-center justify-between p-4 bg-arca-surface-1">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconTone(event)}`}>
                    <CalendarIcon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-arca-text-primary">{event.title}</p>
                    <p className="text-[10px] text-arca-text-dim font-bold uppercase tracking-tighter">
                      {event.dateLabel} · {event.secondaryLabel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${amountTone(event)}`}>{event.amountLabel}</p>
                  <span className={`inline-flex mt-1 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${badgeTone(event)}`}>
                    {labelForEvent(event)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-xs text-arca-text-dim">No hay eventos programados para este mes.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function labelForEvent(event: CalendarMonth['events'][number]) {
  if (event.kind === 'income') return 'Ingreso';
  if (event.kind === 'receivable') return 'Cobro';
  return 'Pago';
}

function iconTone(event: CalendarMonth['events'][number]) {
  if (event.status === 'overdue') return 'bg-arca-alert/10 text-arca-alert';
  if (event.kind === 'income' || event.kind === 'receivable') return 'bg-arca-positive/10 text-arca-positive';
  return 'bg-arca-accent/10 text-arca-accent';
}

function amountTone(event: CalendarMonth['events'][number]) {
  if (event.kind === 'income' || event.kind === 'receivable') return 'text-arca-positive';
  if (event.status === 'overdue') return 'text-arca-alert';
  return 'text-arca-text-primary';
}

function badgeTone(event: CalendarMonth['events'][number]) {
  if (event.status === 'overdue') return 'bg-arca-alert/10 text-arca-alert';
  if (event.kind === 'income' || event.kind === 'receivable') return 'bg-arca-positive/10 text-arca-positive';
  return 'bg-arca-accent/10 text-arca-accent';
}
