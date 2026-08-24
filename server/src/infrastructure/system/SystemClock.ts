import type { Clock } from '../../application/ports/Clock.js';

/** Đồng hồ thật. Test dùng bản cài đặt khác trả về một thời điểm cố định. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
