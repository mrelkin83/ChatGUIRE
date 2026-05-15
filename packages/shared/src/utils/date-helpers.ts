import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/es';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('es');

const DEFAULT_TZ = 'America/Bogota';

export const dateHelpers = {
  nowInTz: (tz: string = DEFAULT_TZ) => dayjs().tz(tz),
  
  formatDisplayDateNatural: (date: string | Date, tz: string = DEFAULT_TZ) => {
    return dayjs(date).tz(tz).format('dddd D [de] MMMM');
  },
  
  formatTimeNatural: (time: string) => {
    // time format: HH:mm:ss or HH:mm
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  },

  addMinutesToTime: (time: string, minutes: number) => {
    const [h, m] = time.split(':');
    return dayjs().hour(parseInt(h)).minute(parseInt(m)).add(minutes, 'minute').format('HH:mm:ss');
  }
};
