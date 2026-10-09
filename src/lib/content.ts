/**
 * General, educational descriptions of each discipline. These describe the
 * sports in general — they are NOT claims about KAFMAF's syllabus, grading,
 * instructors or affiliations.
 */
import type { Discipline } from './types'

export interface DisciplineInfo {
  id: Discipline
  name: string
  origin: string
  summary: string
  focus: string[]
}

export const DISCIPLINE_INFO: Record<Discipline, DisciplineInfo> = {
  karate: {
    id: 'karate',
    name: 'Karate',
    origin: 'Developed in Okinawa, Japan',
    summary:
      'Karate is a striking art built on punches, kicks, knee and elbow strikes and open-hand techniques. Training traditionally combines repeated fundamentals, pre-arranged forms and controlled sparring, with strong emphasis on posture, timing and self-control.',
    focus: ['Kihon — fundamental techniques', 'Kata — pre-arranged forms', 'Kumite — controlled sparring'],
  },
  boxing: {
    id: 'boxing',
    name: 'Boxing',
    origin: 'Combat sport practised worldwide',
    summary:
      'Boxing is a combat sport in which two athletes strike only with gloved fists, under rules that structure bouts into timed rounds and weight classes. Training develops footwork, defence, punching technique and a high level of cardiovascular conditioning.',
    focus: ['Stance and footwork', 'Defence: blocking, slipping and movement', 'Pad work, bag work and conditioning'],
  },
  taekwondo: {
    id: 'taekwondo',
    name: 'Taekwondo',
    origin: 'Developed in Korea',
    summary:
      'Taekwondo is a Korean martial art best known for its fast, high and spinning kicks. Practitioners train patterns of movement, sparring and flexibility, and the sport version has been part of the Olympic programme since the 2000 Games.',
    focus: ['Poomsae — patterns', 'Kyorugi — sparring', 'Kicking technique, balance and flexibility'],
  },
}
