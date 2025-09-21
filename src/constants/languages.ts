import { Language } from '../types';

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
];

export const MOCK_TRANSCRIPTS: Record<string, string> = {
  en: 'I am selling a beautiful handwoven silk scarf with traditional Indian patterns. It is made from pure silk and features intricate gold thread work. This scarf took me three weeks to complete and represents generations of weaving tradition from my family.',
  hi: 'मैं एक सुंदर हाथ से बुना हुआ रेशमी दुपट्टा बेच रहा हूं जिसमें पारंपरिक भारतीय पैटर्न हैं। यह शुद्ध रेशम से बना है और इसमें जटिल सोने के धागे का काम है।',
  bn: 'আমি একটি সুন্দর হাতে বোনা রেশমি স্কার্ফ বিক্রি করছি যাতে ঐতিহ্যবাহী ভারতীয় নকশা রয়েছে। এটি খাঁটি রেশম দিয়ে তৈরি এবং জটিল সোনার সুতার কাজ রয়েছে।',
  ta: 'நான் பாரம்பரிய இந்திய வடிவங்களுடன் கூடிய அழகான கையால் நெய்யப்பட்ட பட்டு துப்பட்டியை விற்கிறேன். இது தூய பட்டில் செய்யப்பட்டு சிக்கலான தங்க நூல் வேலைப்பாடு உள்ளது।',
  gu: 'હું પરંપરાગત ભારતીય પેટર્ન સાથે એક સુંદર હાથથી વણાયેલો રેશમી સ્કાર્ફ વેચી રહ્યો છું. તે શુદ્ધ રેશમથી બનેલો છે અને જટિલ સોનાના દોરાનું કામ છે।',
  mr: 'मी पारंपारिक भारतीय नमुन्यांसह एक सुंदर हाताने विणलेला रेशमी स्कार्फ विकत आहे. हे शुद्ध रेशमापासून बनवले आहे आणि त्यात गुंतागुंतीचे सोन्याचे धागे आहेत.'
};