import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export function hashPassword(password:string){
  const salt=randomBytes(16).toString('hex');
  const hash=scryptSync(password,salt,64).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(password:string,stored:string){
  try{
    const [salt,hex]=stored.split(':');
    if(!salt||!hex)return false;
    const actual=scryptSync(password,salt,64);
    const expected=Buffer.from(hex,'hex');
    return expected.length===actual.length&&timingSafeEqual(expected,actual);
  }catch{return false}
}
