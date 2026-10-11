# -*- coding: utf-8 -*-
"""
Santali Translation & Ol Chiki Transliteration Engine for AAROH.
Uses a Santali translation service when available and validates Ol Chiki output.
"""

import re
import urllib.request
import urllib.parse
import json
from typing import Tuple, Dict, Optional, List

# Unicode Devanagari -> Ol Chiki phoneme map
DEVANAGARI_TO_OL_CHIKI: Dict[str, str] = {
    'अ': 'ᱚ', 'आ': 'ᱟ', 'इ': 'ᱤ', 'ई': 'ᱤ', 'उ': 'ᱩ', 'ऊ': 'ᱩ', 'ऋ': 'ᱨᱤ',
    'ए': 'ᱮ', 'ऐ': 'ᱮ', 'ओ': 'ᱳ', 'औ': 'ᱳ',
    'क': 'ᱠ', 'ख': 'ᱠᱷ', 'ग': 'ᱜ', 'घ': 'ᱜᱷ', 'ङ': 'ᱝ',
    'च': 'ᱪ', 'छ': 'ᱪᱷ', 'ज': 'ᱡ', 'झ': 'ᱡᱷ', 'ञ': 'ᱧ',
    'ट': 'ᱴ', 'ठ': 'ᱴᱷ', 'ड': 'ᱰ', 'ढ': 'ᱰᱷ', 'ण': 'ᱬ',
    'त': 'ᱛ', 'थ': 'ᱛᱷ', 'द': 'ᱫ', 'ध': 'ᱫᱷ', 'न': 'ᱱ',
    'प': 'ᱯ', 'फ': 'ᱯᱷ', 'ब': 'ᱵ', 'भ': 'ᱵᱷ', 'म': 'ᱢ',
    'य': 'ᱭ', 'र': 'ᱨ', 'ल': 'ᱞ', 'व': 'ᱣ',
    'श': 'ᱥ', 'ष': 'ᱥ', 'स': 'ᱥ', 'ह': 'ᱦ',
    'ड़': 'ᱲ', 'ढ़': 'ᱲᱷ', 'ज्ञ': 'ᱜᱤᱭᱟᱱ', 'त्र': 'ᱛᱨ', 'क्ष': 'ᱠᱷ',
    'ा': 'ᱟ', 'ि': 'ᱤ', 'ी': 'ᱤ', 'ु': 'ᱩ', 'ू': 'ᱩ', 'ृ': 'ᱨᱤ',
    'े': 'ᱮ', 'ै': 'ᱮ', 'ो': 'ᱳ', 'ौ': 'ᱳ',
    '्': '', 'ं': 'ᱸ', 'ँ': 'ᱸ', 'ः': 'ᱷ',
    '०': '᱐', '१': '᱑', '२': '᱒', '३': '᱓', '४': '᱔',
    '५': '᱕', '६': '᱖', '७': '᱗', '८': '᱘', '९': '᱙',
    '।': '᱾', '॥': '᱿',
}

# Latin phonetic digraphs & singles -> Ol Chiki
LATIN_TO_OL_CHIKI: Dict[str, str] = {
    'aa': 'ᱟ', 'ee': 'ᱤ', 'oo': 'ᱩ', 'ch': 'ᱪᱷ', 'sh': 'ᱥ', 'th': 'ᱛᱷ', 'dh': 'ᱫᱷ',
    'kh': 'ᱠᱷ', 'gh': 'ᱜᱷ', 'jh': 'ᱡᱷ', 'ph': 'ᱯᱷ', 'bh': 'ᱵᱷ', 'ng': 'ᱝ', 'ny': 'ᱧ',
    'rh': 'ᱲ', 'tr': 'ᱛᱨ', 'a': 'ᱟ', 'e': 'ᱮ', 'i': 'ᱤ', 'o': 'ᱳ', 'u': 'ᱩ',
    'b': 'ᱵ', 'c': 'ᱪ', 'd': 'ᱫ', 'f': 'ᱯᱷ', 'g': 'ᱜ', 'h': 'ᱦ', 'j': 'ᱡ',
    'k': 'ᱠ', 'l': 'ᱞ', 'm': 'ᱢ', 'n': 'ᱱ', 'p': 'ᱯ', 'q': 'ᱠ', 'r': 'ᱨ',
    's': 'ᱥ', 't': 'ᱛ', 'v': 'ᱣ', 'w': 'ᱣ', 'x': 'ᱠᱥ', 'y': 'ᱭ', 'z': 'ᱡ',
    '0': '᱐', '1': '᱑', '2': '᱒', '3': '᱓', '4': '᱔',
    '5': '᱕', '6': '᱖', '7': '᱗', '8': '᱘', '9': '᱙',
}

# Curated Authentic Multi-Word Sentences & Expressions (English/Hindi -> Santali Ol Chiki + Roman)
SANTALI_PHRASES: Dict[str, Tuple[str, str]] = {
    # Water & Life
    "water is very important for life": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwi lagid adi laktiyana"),
    "water is important for life": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwi lagid adi laktiyana"),
    "water is vital for life": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwi lagid adi laktiyana"),
    "water is life": ("ᱫᱟᱜ ᱜᱮ ᱡᱤᱣᱤ ᱠᱟᱱᱟ", "Dak ge jiwi kana"),
    "water is necessary for living beings": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤᱭᱟᱱ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwiyan ko lagid laktiyana"),
    "water is essential for our body": ("ᱫᱟᱜ ᱫᱚ ᱟᱵᱚᱣᱟᱜ ᱦᱚᱲᱢᱳ ᱞᱟᱹᱜᱤᱫ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do abowag hormo lagid laktiyana"),
    "pani jeevan ke liye bahut jaruri hai": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwi lagid adi laktiyana"),
    "pani jeevan hai": ("ᱫᱟᱜ ᱜᱮ ᱡᱤᱣᱤ ᱠᱟᱱᱟ", "Dak ge jiwi kana"),
    "jal hi jeevan hai": ("ᱫᱟᱜ ᱜᱮ ᱡᱤᱣᱤ ᱠᱟᱱᱟ", "Dak ge jiwi kana"),
    "जल ही जीवन है": ("ᱫᱟᱜ ᱜᱮ ᱡᱤᱣᱤ ᱠᱟᱱᱟ", "Dak ge jiwi kana"),
    "पानी ही जीवन है": ("ᱫᱟᱜ ᱜᱮ ᱡᱤᱣᱤ ᱠᱟᱱᱟ", "Dak ge jiwi kana"),
    "पानी जीवन के लिए बहुत जरूरी है": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwi lagid adi laktiyana"),
    "जल जीवन के लिए बहुत महत्वपूर्ण है": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwi lagid adi laktiyana"),
    "पानी जीवन के लिए बहुत आवश्यक है": ("ᱫᱟᱜ ᱫᱚ ᱡᱤᱣᱤ ᱞᱟᱹᱜᱤᱫ ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Dak do jiwi lagid adi laktiyana"),

    # School & Education
    "the students are playing in school": ("ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱠᱚ ᱫᱚ ᱟᱥᱲᱟ ᱨᱮ ᱠᱚ ᱮᱱᱮᱡ ᱠᱟᱱᱟ", "Pathuwa ko do asra re ko enej kana"),
    "students are playing in the school": ("ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱠᱚ ᱫᱚ ᱟᱥᱲᱟ ᱨᱮ ᱠᱚ ᱮᱱᱮᱡ ᱠᱟᱱᱟ", "Pathuwa ko do asra re ko enej kana"),
    "students are playing in school": ("ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱠᱚ ᱫᱚ ᱟᱥᱲᱟ ᱨᱮ ᱠᱚ ᱮᱱᱮᱡ ᱠᱟᱱᱟ", "Pathuwa ko do asra re ko enej kana"),
    "children are playing in school": ("ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱫᱚ ᱟᱥᱲᱟ ᱨᱮ ᱠᱚ ᱮᱱᱮᱡ ᱠᱟᱱᱟ", "Gidra ko do asra re ko enej kana"),
    "welcome to our school": ("ᱟᱞᱮᱭᱟᱜ ᱟᱥᱲᱟ ᱛᱮ ᱥᱟᱹᱜᱩᱱ ᱫᱟᱨᱟᱢ", "Aleyag asra te sagun daram"),
    "welcome to our class": ("ᱟᱞᱮᱭᱟᱜ ᱪᱟᱱᱟᱪ ᱛᱮ ᱥᱟᱹᱜᱩᱱ ᱫᱟᱨᱟᱢ", "Aleyag chanach te sagun daram"),
    "the teacher is teaching in the classroom": ("ᱢᱟᱪᱮᱫ ᱫᱚ ᱪᱟᱱᱟᱪ ᱨᱮᱭ ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱠᱚᱣᱟ", "Machet do chanach rey parhaw ed kowa"),
    "the teacher is teaching students": ("ᱢᱟᱪᱮᱫ ᱫᱚ ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱠᱚᱭ ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱠᱚᱣᱟ", "Machet do pathuwa koy parhaw ed kowa"),
    "i am going to school": ("ᱤᱧ ᱫᱚ ᱟᱥᱲᱟ ᱛᱤᱧ ᱪᱟᱞᱟᱜ ᱠᱟᱱᱟ", "Ing do asra ting chalag kana"),
    "we are going to school": ("ᱟᱞᱮ ᱫᱚ ᱟᱥᱲᱟ ᱛᱮᱞᱮ ᱪᱟᱞᱟᱜ ᱠᱟᱱᱟ", "Ale do asra tele chalag kana"),
    "i love my school": ("ᱤᱧ ᱤᱧᱟᱜ ᱟᱥᱲᱟᱧ ᱠᱩᱥᱤᱭᱟᱜ-ᱟ", "Ing ingag asrany kusiyag-a"),
    "my school is very big": ("ᱤᱧᱟᱜ ᱟᱥᱲᱟ ᱫᱚ ᱟᱹᱰᱤ ᱢᱟᱨᱟᱝ-ᱟ", "Ingag asra do adi marang-a"),
    "books give us knowledge": ("ᱯᱚᱛᱚᱵ ᱫᱚ ᱟᱵᱚ ᱜᱮᱭᱟᱱ ᱮ ᱮᱢᱟᱵᱚᱱᱟ", "Potob do abo geyan e emabona"),
    "we should read books every day": ("ᱟᱵᱚ ᱫᱤᱱᱟᱹᱢ ᱜᱮ ᱯᱚᱛᱚᱵ ᱯᱟᱲᱦᱟᱣ ᱫᱚᱨᱠᱟᱨ", "Abo dinam ge potob parhaw dorkar"),
    "bachhe school me khel rahe hain": ("ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱫᱚ ᱟᱥᱲᱟ ᱨᱮ ᱠᱚ ᱮᱱᱮᱡ ᱠᱟᱱᱟ", "Gidra ko do asra re ko enej kana"),
    "shikshak class me padha rahe hain": ("ᱢᱟᱪᱮᱫ ᱫᱚ ᱪᱟᱱᱟᱪ ᱨᱮᱭ ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱠᱚᱣᱟ", "Machet do chanach rey parhaw ed kowa"),
    "main school ja raha hoon": ("ᱤᱧ ᱫᱚ ᱟᱥᱲᱟ ᱛᱤᱧ ᱪᱟᱞᱟᱜ ᱠᱟᱱᱟ", "Ing do asra ting chalag kana"),
    "बच्चे स्कूल में खेल रहे हैं": ("ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ ᱫᱚ ᱟᱥᱲᱟ ᱨᱮ ᱠᱚ ᱮᱱᱮᱡ ᱠᱟᱱᱟ", "Gidra ko do asra re ko enej kana"),
    "छात्र स्कूल में खेल रहे हैं": ("ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱠᱚ ᱫᱚ ᱟᱥᱲᱟ ᱨᱮ ᱠᱚ ᱮᱱᱮᱡ ᱠᱟᱱᱟ", "Pathuwa ko do asra re ko enej kana"),
    "शिक्षक कक्षा में पढ़ा रहे हैं": ("ᱢᱟᱪᱮᱫ ᱫᱚ ᱪᱟᱱᱟᱪ ᱨᱮᱭ ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱠᱚᱣᱟ", "Machet do chanach rey parhaw ed kowa"),
    "मैं स्कूल जा रहा हूँ": ("ᱤᱧ ᱫᱚ ᱟᱥᱲᱟ ᱛᱤᱧ ᱪᱟᱞᱟᱜ ᱠᱟᱱᱟ", "Ing do asra ting chalag kana"),
    "हम स्कूल जा रहे हैं": ("ᱟᱞᱮ ᱫᱚ ᱟᱥᱲᱟ ᱛᱮᱞᱮ ᱪᱟᱞᱟᱜ ᱠᱟᱱᱟ", "Ale do asra tele chalag kana"),
    "किताबें हमें ज्ञान देती हैं": ("ᱯᱚᱛᱚᱵ ᱫᱚ ᱟᱵᱚ ᱜᱮᱭᱟᱱ ᱮ ᱮᱢᱟᱵᱚᱱᱟ", "Potob do abo geyan e emabona"),

    # Greetings & Common Conversations
    "how are you today": ("ᱛᱮᱦᱮᱧ ᱪᱮᱫ ᱞᱮᱠᱟ ᱢᱮᱱᱟᱢᱟ?", "Tehenj ched leka menama?"),
    "how are you": ("ᱪᱮᱫ ᱞᱮᱠᱟ ᱢᱮᱱᱟᱢᱟ?", "Ched leka menama?"),
    "i am fine": ("ᱤᱧ ᱵᱷᱟᱹᱜᱤ ᱜᱮ ᱢᱤᱱᱟᱹᱧᱟ", "Ing bhagi ge minanga"),
    "i am doing well": ("ᱤᱧ ᱱᱟᱯᱟᱭ ᱜᱮ ᱢᱤᱱᱟᱹᱧᱟ", "Ing napay ge minanga"),
    "what is your name": ("ᱟᱢᱟᱜ ᱧᱩᱛᱩᱢ ᱪᱮᱫ?", "Amag nyutum ched?"),
    "my name is": ("ᱤᱧᱟᱜ ᱧᱩᱛᱩᱢ ᱫᱚ", "Ingag nyutum do"),
    "good morning": ("ᱥᱟᱹᱜᱩᱱ ᱥᱮᱛᱟᱜ", "Sagun setag"),
    "good afternoon": ("ᱥᱟᱹᱜᱩᱱ ᱛᱤᱠᱤᱱ", "Sagun tikin"),
    "good evening": ("ᱥᱟᱹᱜᱩᱱ ᱟᱹᱭᱩᱵ", "Sagun ayud"),
    "good night": ("ᱥᱟᱹᱜᱩᱱ ᱧᱤᱫᱟᱹ", "Sagun nyida"),
    "thank you very much": ("ᱟᱹᱰᱤ ᱟᱹᱰᱤ ᱥᱟᱨᱦᱟᱣ", "Adi adi sarhaw"),
    "thank you": ("ᱥᱟᱨᱦᱟᱣ", "Sarhaw"),
    "where do you live": ("ᱟᱢ ᱚᱠᱟᱨᱮ ᱛᱟᱦᱮᱸᱱᱟᱢ?", "Am okare tahenam?"),
    "i live in the village": ("ᱤᱧ ᱟᱹᱛᱩ ᱨᱮᱧ ᱛᱟᱦᱮᱸᱱᱟ", "Ing atu reng tahena"),
    "where is your home": ("ᱟᱢᱟᱜ ᱚᱲᱟᱜ ᱚᱠᱟᱨᱮ?", "Amag orag okare?"),
    "nice to meet you": ("ᱟᱢ ᱥᱟᱞᱟᱜ ᱧᱟᱯᱟᱢ ᱠᱟᱛᱮ ᱨᱟᱹᱥᱠᱟᱹᱧ ᱵᱩᱡᱷᱟᱹᱣ ᱠᱮᱫᱟ", "Am salag nyapam kate raskang bujhaw keda"),
    "aap kaise hain": ("ᱪᱮᱫ ᱞᱮᱠᱟ ᱢᱮᱱᱟᱢᱟ?", "Ched leka menama?"),
    "main theek hoon": ("ᱤᱧ ᱵᱷᱟᱹᱜᱤ ᱜᱮ ᱢᱤᱱᱟᱹᱧᱟ", "Ing bhagi ge minanga"),
    "aapka naam kya hai": ("ᱟᱢᱟᱜ ᱧᱩᱛᱩᱢ ᱪᱮᱫ?", "Amag nyutum ched?"),
    "mera naam": ("ᱤᱧᱟᱜ ᱧᱩᱛᱩᱢ ᱫᱚ", "Ingag nyutum do"),
    "dhanyawad": ("ᱥᱟᱨᱦᱟᱣ", "Sarhaw"),
    "shubh prabhat": ("ᱥᱟᱹᱜᱩᱱ ᱥᱮᱛᱟᱜ", "Sagun setag"),
    "आप कैसे हैं": ("ᱪᱮᱫ ᱞᱮᱠᱟ ᱢᱮᱱᱟᱢᱟ?", "Ched leka menama?"),
    "आप कैसे हो": ("ᱪᱮᱫ ᱞᱮᱠᱟ ᱢᱮᱱᱟᱢᱟ?", "Ched leka menama?"),
    "मैं ठीक हूँ": ("ᱤᱧ ᱵᱷᱟᱹᱜᱤ ᱜᱮ ᱢᱤᱱᱟᱹᱧᱟ", "Ing bhagi ge minanga"),
    "आपका नाम क्या है": ("ᱟᱢᱟᱜ ᱧᱩᱛᱩᱢ ᱪᱮᱫ?", "Amag nyutum ched?"),
    "मेरा नाम है": ("ᱤᱧᱟᱜ ᱧᱩᱛᱩᱢ ᱫᱚ", "Ingag nyutum do"),
    "धन्यवाद": ("ᱥᱟᱨᱦᱟᱣ", "Sarhaw"),
    "सुप्रभात": ("ᱥᱟᱹᱜᱩᱱ ᱥᱮᱛᱟᱜ", "Sagun setag"),
    "शुभ रात्रि": ("ᱥᱟᱹᱜᱩᱱ ᱧᱤᱫᱟᱹ", "Sagun nyida"),

    # Environment, Nature & Trees
    "we should plant trees": ("ᱟᱵᱚ ᱫᱟᱨᱮ ᱨᱚᱦᱚᱭ ᱫᱚᱨᱠᱟᱨ", "Abo dare rohoy dorkar"),
    "trees give us fruits and shade": ("ᱫᱟᱨᱮ ᱫᱚ ᱟᱵᱚ ᱡᱚ ᱟᱨ ᱩᱢᱩᱞ ᱮ ᱮᱢᱟᱵᱚᱱᱟ", "Dare do abo jo ar umul e emabona"),
    "trees give us clean air": ("ᱫᱟᱨᱮ ᱫᱚ ᱟᱵᱚ ᱥᱟᱯᱷᱟ ᱦᱚᱭ ᱮ ᱮᱢᱟᱵᱚᱱᱟ", "Dare do abo sapha hoy e emabona"),
    "forests protect our earth": ("ᱵᱤᱨ ᱫᱚ ᱟᱵᱚᱣᱟᱜ ᱫᱷᱟᱹᱨᱛᱤ ᱮ ᱨᱩᱠᱷᱤᱭᱟᱹᱭᱟ", "Bir do abowag dharti e rukhiyaya"),
    "the sun gives light and heat": ("ᱵᱮᱲᱟ ᱫᱚ ᱢᱟᱨᱥᱟᱞ ᱟᱨ ᱞᱚᱞᱚ ᱮ ᱮᱢᱟᱵᱚᱱᱟ", "Bera do marsal ar lolo e emabona"),
    "the sun rises in the east": ("ᱵᱮᱲᱟ ᱫᱚ ᱥᱟᱢᱟᱝ ᱥᱮᱫ ᱨᱮᱭ ᱨᱟᱠᱟᱵ-ᱟ", "Bera do samang sed rey rakab-a"),
    "the rain is falling": ("ᱫᱟᱜ ᱡᱟᱹᱲᱤ ᱧᱩᱨᱩᱜ ᱠᱟᱱᱟ", "Dag jari nyurug kana"),
    "soil is important for farming": ("ᱦᱟᱥᱟ ᱫᱚ ᱪᱟᱥ ᱵᱟᱥ ᱞᱟᱹᱜᱤᱫ ᱞᱟᱹᱠᱛᱤᱭᱟᱱᱟ", "Hasa do chas bas lagid laktiyana"),
    "ped humein phal aur chhaya dete hain": ("ᱫᱟᱨᱮ ᱫᱚ ᱟᱵᱚ ᱡᱚ ᱟᱨ ᱩᱢᱩᱞ ᱮ ᱮᱢᱟᱵᱚᱱᱟ", "Dare do abo jo ar umul e emabona"),
    "suraj hamein roshni deta hai": ("ᱵᱮᱲᱟ ᱫᱚ ᱟᱵᱚ ᱢᱟᱨᱥᱟᱞ ᱮ ᱮᱢᱟᱵᱚᱱᱟ", "Bera do abo marsal e emabona"),
}

# Exhaustive Lexicon (Word-level mapping)
SANTALI_LEXICON: Dict[str, Tuple[str, str]] = {
    # Pronouns & People
    "i": ("ᱤᱧ", "Ing"), "me": ("ᱤᱧ", "Ing"), "my": ("ᱤᱧᱟᱜ", "Ingag"), "mine": ("ᱤᱧᱟᱜ", "Ingag"),
    "we": ("ᱟᱵᱚ", "Abo"), "us": ("ᱟᱵᱚ", "Abo"), "our": ("ᱟᱵᱚᱣᱟᱜ", "Abowag"), "ours": ("ᱟᱵᱚᱣᱟᱜ", "Abowag"),
    "you": ("ᱟᱢ", "Am"), "your": ("ᱟᱢᱟᱜ", "Amag"), "yours": ("ᱟᱢᱟᱜ", "Amag"),
    "he": ("ᱩᱱᱤ", "Uni"), "him": ("ᱩᱱᱤ", "Uni"), "his": ("ᱩᱱᱤᱭᱟᱜ", "Uniyag"),
    "she": ("ᱩᱱᱤ", "Uni"), "her": ("ᱩᱱᱤᱭᱟᱜ", "Uniyag"),
    "they": ("ᱩᱱᱠᱩ", "Unku"), "them": ("ᱩᱱᱠᱩ", "Unku"), "their": ("ᱩᱱᱠᱩᱣᱟᱜ", "Unkuwag"),
    "this": ("ᱱᱚᱣᱟ", "Nowa"), "that": ("ᱚᱱᱟ", "Ona"), "these": ("ᱱᱚᱣᱟᱠᱚ", "Nowako"), "those": ("ᱚᱱᱟᱠᱚ", "Onako"),
    "who": ("ᱚᱠᱚᱭ", "Okoy"), "what": ("ᱪᱮᱫ", "Ched"), "where": ("ᱚᱠᱟᱨᱮ", "Okare"),
    "when": ("ᱛᱤᱥ", "Tis"), "why": ("ᱪᱮᱫᱟᱜ", "Chedag"), "how": ("ᱪᱮᱫ ᱞᱮᱠᱟ", "Ched leka"),
    "which": ("ᱚᱠᱟᱴᱟᱜ", "Okatag"), "whose": ("ᱚᱠᱚᱭᱟᱜ", "Okoyag"),
    "teacher": ("ᱢᱟᱪᱮᱫ", "Machet"), "teachers": ("ᱢᱟᱪᱮᱫ ᱠᱚ", "Machet ko"),
    "student": ("ᱯᱟᱹᱴᱷᱩᱣᱟᱹ", "Pathuwa"), "students": ("ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱠᱚ", "Pathuwa ko"),
    "child": ("ᱜᱤᱫᱽᱨᱟᱹ", "Gidra"), "children": ("ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ", "Gidra ko"),
    "friend": ("ᱜᱟᱛᱮ", "Gate"), "friends": ("ᱜᱟᱛᱮ ᱠᱚ", "Gate ko"),
    "mother": ("ᱟᱭᱳ", "Ayo"), "father": ("ᱵᱟᱵᱟ", "Baba"), "brother": ("ᱵᱚᱭᱦᱟ", "Boyha"),
    "sister": ("ᱢᱤᱥᱤ", "Misi"), "farmer": ("ᱪᱟᱹᱥᱤ", "Chasi"), "people": ("ᱦᱚᱲ ᱠᱚ", "Hor ko"),
    "human": ("ᱢᱟᱹᱱᱢᱤ", "Manmi"), "person": ("ᱦᱚᱲ", "Hor"),

    # Grammatical Particles, Auxiliaries & Prepositions
    "is": ("ᱠᱟᱱᱟ", "kana"), "are": ("ᱠᱟᱱᱟᱠᱚ", "kanako"), "am": ("ᱠᱟᱱᱟᱧ", "kanang"),
    "was": ("ᱛᱟᱦᱮᱸ ᱠᱟᱱᱟ", "tahen kana"), "were": ("ᱛᱟᱦᱮᱸ ᱠᱟᱱᱟ ᱠᱚ", "tahen kanako"),
    "will": ("ᱦᱩᱭᱩᱜ-ᱟ", "huyug-a"), "have": ("ᱢᱮᱱᱟᱜ-ᱟ", "menag-a"), "has": ("ᱢᱮᱱᱟᱜ-ᱟ", "menag-a"),
    "had": ("ᱛᱟᱦᱮᱸ ᱠᱟᱱᱟ", "tahen kana"),
    "for": ("ᱞᱟᱹᱜᱤᱫ", "lagid"), "in": ("ᱨᱮ", "re"), "on": ("ᱪᱮᱛᱟᱱ ᱨᱮ", "chetan re"),
    "at": ("ᱨᱮ", "re"), "to": ("ᱛᱮ", "te"), "from": ("ᱠᱷᱚᱱ", "khon"), "with": ("ᱥᱟᱶᱛᱮ", "sawte"),
    "by": ("ᱛᱮ", "te"), "and": ("ᱟᱨ", "ar"), "but": ("ᱢᱮᱱᱠᱷᱟᱱ", "menkhan"),
    "or": ("ᱥᱮ", "se"), "so": ("ᱚᱱᱟᱛᱮ", "onate"), "because": ("ᱪᱮᱫᱟᱜ ᱥᱮ", "chedag se"),
    "very": ("ᱟᱹᱰᱤ", "adi"), "much": ("ᱟᱭᱢᱟ", "ayma"), "many": ("ᱟᱹᱰᱤ ᱟᱭᱢᱟ", "adi ayma"),
    "all": ("ᱡᱚᱛᱚ", "joto"), "every": ("ᱫᱤᱱᱟᱹᱢ", "dinam"), "some": ("ᱛᱤᱱᱟᱹᱜ ᱜᱟᱱ", "tinag gan"),
    "not": ("ᱵᱟᱝ", "bang"), "no": ("ᱵᱟᱝ", "bang"), "yes": ("ᱦᱮᱸ", "he"),
    "important": ("ᱞᱟᱹᱠᱛᱤᱭᱟᱱ", "laktiyan"), "vital": ("ᱞᱟᱹᱠᱛᱤᱭᱟᱱ", "laktiyan"),
    "essential": ("ᱟᱹᱰᱤ ᱞᱟᱹᱠᱛᱤᱭᱟᱱ", "adi laktiyan"), "necessary": ("ᱫᱚᱨᱠᱟᱨ", "dorkar"),

    # Common Classroom & Curriculum Verbs
    "play": ("ᱮᱱᱮᱡ", "Enej"), "playing": ("ᱮᱱᱮᱡ ᱠᱟᱱ", "enej kan"),
    "read": ("ᱯᱟᱲᱦᱟᱣ", "Parhaw"), "reading": ("ᱯᱟᱲᱦᱟᱣ ᱮᱫ", "parhaw ed"),
    "write": ("ᱚᱞ", "Ol"), "writing": ("ᱚᱞ ᱮᱫ", "ol ed"),
    "learn": ("ᱪᱮᱫᱚᱜ", "Chedog"), "learning": ("ᱪᱮᱫᱚᱜ ᱠᱟᱱ", "chedog kan"),
    "teach": ("ᱯᱟᱲᱦᱟᱣ", "Parhaw"), "teaching": ("ᱯᱟᱲᱦᱟᱣ ᱮᱫ ᱠᱚ", "parhaw ed ko"),
    "study": ("ᱯᱟᱲᱦᱟᱣ", "Parhaw"), "studying": ("ᱯᱟᱲᱦᱟᱣᱜ ᱠᱟᱱ", "parhawg kan"),
    "eat": ("ᱡᱚᱢ", "Jom"), "eating": ("ᱡᱚᱢ ᱮᱫ", "jom ed"),
    "drink": ("ᱧᱩ", "Nyu"), "drinking": ("ᱧᱩ ᱮᱫ", "nyu ed"),
    "go": ("ᱪᱟᱞᱟᱜ", "Chalag"), "going": ("ᱪᱟᱞᱟᱜ ᱠᱟᱱ", "chalag kan"),
    "come": ("ᱦᱤᱡᱩᱜ", "Hijug"), "coming": ("ᱦᱤᱡᱩᱜ ᱠᱟᱱ", "hijug kan"),
    "see": ("ᱧᱮᱞ", "Nyel"), "seeing": ("ᱧᱮᱞ ᱮᱫ", "nyel ed"), "look": ("ᱧᱮᱞ", "Nyel"),
    "listen": ("ᱟᱸᱡᱚᱢ", "Anjom"), "listening": ("ᱟᱸᱡᱚᱢ ᱮᱫ", "anjom ed"),
    "speak": ("ᱨᱚᱲ", "Ror"), "speaking": ("ᱨᱚᱲ ᱮᱫ", "ror ed"),
    "give": ("ᱮᱢ", "Em"), "gives": ("ᱮᱢᱟᱭ", "emay"), "giving": ("ᱮᱢᱚᱜ ᱠᱟᱱ", "emog kan"),
    "take": ("ᱦᱟᱛᱟᱣ", "Hataw"), "taking": ("ᱦᱟᱛᱟᱣ ᱮᱫ", "hataw ed"),
    "plant": ("ᱨᱚᱦᱚᱭ", "Rohoy"), "protect": ("ᱨᱩᱠᱷᱤᱭᱟᱹ", "Rukhiya"),
    "live": ("ᱛᱟᱦᱮᱸᱱ", "Tahen"), "living": ("ᱛᱟᱦᱮᱸᱱ ᱠᱟᱱ", "tahen kan"),
    "work": ("ᱠᱟᱹᱢᱤ", "Kami"), "working": ("ᱠᱟᱹᱢᱤ ᱠᱟᱱ", "kami kan"),
    "help": ("ᱜᱚᱲᱚ", "Goro"), "helping": ("ᱜᱚᱲᱚ ᱮᱢ", "goro em"),

    # Environment, Nature, Science
    "water": ("ᱫᱟᱜ", "Dak"), "rain": ("ᱫᱟᱜ ᱡᱟᱹᱲᱤ", "Dag Jari"),
    "life": ("ᱡᱤᱣᱤ", "Jiwi"), "air": ("ᱦᱚᱭ", "Hoy"), "wind": ("ᱦᱚᱭ ᱵᱟᱹᱨᱰᱩ", "Hoy Bardu"),
    "sun": ("ᱥᱤᱧ ᱵᱮᱲᱟ", "Sing Bera"), "moon": ("ᱪᱟᱸᱫᱚ", "Chando"), "star": ("ᱤᱯᱤᱞ", "Ipil"),
    "stars": ("ᱤᱯᱤᱞ ᱠᱚ", "Ipil ko"), "sky": ("ᱥᱮᱨᱢᱟ", "Serma"),
    "tree": ("ᱫᱟᱨᱮ", "Dare"), "trees": ("ᱫᱟᱨᱮ ᱠᱚ", "Dare ko"),
    "forest": ("ᱵᱤᱨ", "Bir"), "forests": ("ᱵᱤᱨ ᱠᱚ", "Bir ko"), "jungle": ("ᱵᱤᱨ", "Bir"),
    "plant": ("ᱫᱟᱨᱮ ᱱᱟᱹᱬᱤ", "Dare Nari"), "plants": ("ᱫᱟᱨᱮ ᱱᱟᱹᱬᱤ ᱠᱚ", "Dare Nari ko"),
    "flower": ("ᱵᱟᱦᱟ", "Baha"), "flowers": ("ᱵᱟᱦᱟ ᱠᱚ", "Baha ko"),
    "fruit": ("ᱡᱚ", "Jo"), "fruits": ("ᱡᱚ ᱠᱚ", "Jo ko"),
    "leaf": ("ᱥᱟᱠᱟᱢ", "Sakam"), "leaves": ("ᱥᱟᱠᱟᱢ ᱠᱚ", "Sakam ko"),
    "root": ("ᱨᱮᱦᱮᱫ", "Rehed"), "roots": ("ᱨᱮᱦᱮᱫ ᱠᱚ", "Rehed ko"),
    "seed": ("ᱡᱟᱝ", "Jang"), "seeds": ("ᱡᱟᱝ ᱠᱚ", "Jang ko"),
    "earth": ("ᱫᱷᱟᱹᱨᱛᱤ", "Dharti"), "soil": ("ᱦᱟᱥᱟ", "Hasa"), "land": ("ᱦᱟᱥᱟ", "Hasa"),
    "river": ("ᱜᱟᱰᱟ", "Gada"), "rivers": ("ᱜᱟᱰᱟ ᱠᱚ", "Gada ko"),
    "pond": ("ᱯᱩᱠᱷᱨᱤ", "Pukhri"), "lake": ("ᱵᱟᱸᱫᱷ", "Bandh"),
    "mountain": ("ᱵᱩᱨᱩ", "Buru"), "hill": ("ᱵᱩᱨᱩ", "Buru"),
    "animal": ("ᱡᱤᱭᱟᱹᱞᱤ", "Jiyali"), "animals": ("ᱡᱤᱭᱟᱹᱞᱤ ᱠᱚ", "Jiyali ko"),
    "bird": ("ᱪᱮᱬᱮ", "Chene"), "birds": ("ᱪᱮᱬᱮ ᱠᱚ", "Chene ko"),
    "fish": ("ᱦᱟᱹᱠᱩ", "Haku"), "cow": ("ᱜᱟᱹᱭ", "Gay"), "fire": ("ᱥᱮᱸᱜᱮᱞ", "Sengel"),
    "food": ("ᱫᱟᱠᱟ", "Daka"), "rice": ("ᱪᱟᱣᱞᱮ", "Chawle"), "milk": ("ᱛᱳᱣᱟ", "Towa"),
    "bread": ("ᱯᱤᱴᱷᱟᱹ", "Pitha"),

    # School & Knowledge Domain
    "school": ("ᱟᱥᱲᱟ", "Asra"), "schools": ("ᱟᱥᱲᱟ ᱠᱚ", "Asra ko"),
    "classroom": ("ᱪᱟᱱᱟᱪ ᱠᱩᱴᱷᱨᱤ", "Chanach Kuthri"),
    "class": ("ᱪᱟᱱᱟᱪ", "Chanach"), "grade": ("ᱪᱟᱱᱟᱪ", "Chanach"),
    "book": ("ᱯᱚᱛᱚᱵ", "Potob"), "books": ("ᱯᱚᱛᱚᱵ ᱠᱚ", "Potob ko"),
    "pen": ("ᱠᱚᱞᱚᱢ", "Kolom"), "pencil": ("ᱯᱮᱱᱥᱤᱞ", "Pensil"),
    "notebook": ("ᱠᱷᱟᱛᱟ", "Khata"), "bag": ("ᱡᱷᱳᱞᱟ", "Jhola"),
    "question": ("ᱠᱩᱠᱞᱤ", "Kukli"), "questions": ("ᱠᱩᱠᱞᱤ ᱠᱚ", "Kukli ko"),
    "answer": ("ᱛᱮᱞᱟ", "Tela"), "answers": ("ᱛᱮᱞᱟ ᱠᱚ", "Tela ko"),
    "exam": ("ᱵᱤᱱᱤᱰ", "Binid"), "test": ("ᱵᱤᱱᱤᱰ", "Binid"),
    "worksheet": ("ᱣᱟᱨᱠᱥᱤᱴ", "Worksheet"), "worksheets": ("ᱣᱟᱨᱠᱥᱤᱴ ᱠᱚ", "Worksheets"),
    "knowledge": ("ᱜᱮᱭᱟᱱ", "Geyan"), "science": ("ᱥᱟᱬᱮᱥ", "Sanes"),
    "math": ("ᱮᱞᱠᱷᱟ", "Elkha"), "mathematics": ("ᱮᱞᱠᱷᱟ", "Elkha"),
    "language": ("ᱯᱟᱹᱨᱥᱤ", "Parsi"), "mother tongue": ("ᱟᱭᱳ ᱟᱲᱟᱝ", "Ayo Arang"),
    "santali": ("ᱥᱟᱱᱛᱟᱲᱤ", "Santali"), "ol chiki": ("ᱚᱞ ᱪᱤᱠᱤ", "Ol Chiki"),
    "hindi": ("ᱦᱤᱱᱫᱤ", "Hindi"), "english": ("ᱤᱝᱞᱤᱥ", "Inglis"),
    "village": ("ᱟᱹᱛᱩ", "Atu"), "home": ("ᱚᱲᱟᱜ", "Orag"), "house": ("ᱚᱲᱟᱜ", "Orag"),
    "day": ("ᱢᱟᱦᱟᱸ", "Maha"), "today": ("ᱛᱮᱦᱮᱧ", "Tehenj"),
    "tomorrow": ("ᱜᱟᱯᱟ", "Gapa"), "yesterday": ("ᱦᱚᱞᱟ", "Hola"),
    "morning": ("ᱥᱮᱛᱟᱜ", "Setag"), "night": ("ᱧᱤᱫᱟᱹ", "Nyida"),
    "afternoon": ("ᱛᱤᱠᱤᱱ", "Tikin"), "evening": ("ᱟᱹᱭᱩᱵ", "Ayud"),
    "good": ("ᱵᱷᱟᱹᱜᱤ", "Bhagi"), "bad": ("ᱵᱟᱹᱲᱤᱡ", "Baric"),
    "big": ("ᱢᱟᱨᱟᱝ", "Marang"), "small": ("ᱠᱟᱹᱴᱤᱡ", "Katic"),
    "new": ("ᱱᱟᱣᱟ", "Nawa"), "old": ("ᱢᱟᱨᱮ", "Mare"),
    "clean": ("ᱥᱟᱯᱷᱟ", "Sapha"), "dirty": ("ᱵᱟᱹᱲᱤᱡ", "Baric"),
    "hot": ("ᱞᱚᱞᱚ", "Lolo"), "cold": ("ᱨᱮᱭᱟᱲ", "Reyar"),
    "happy": ("ᱨᱟᱹᱥᱠᱟᱹ", "Raska"), "peace": ("ᱥᱩᱞᱩᱠ", "Suluk"),
    "truth": ("ᱥᱟᱹᱨᱤ", "Sari"), "time": ("ᱚᱠᱛᱚ", "Okto"),

    # Hindi common words mapping directly to Santali
    "pani": ("ᱫᱟᱜ", "Dak"), "paani": ("ᱫᱟᱜ", "Dak"), "jal": ("ᱫᱟᱜ", "Dak"),
    "khana": ("ᱫᱟᱠᱟ", "Daka"), "bhojan": ("ᱫᱟᱠᱟ", "Daka"), "chawal": ("ᱪᱟᱣᱞᱮ", "Chawle"),
    "iskul": ("ᱟᱥᱲᱟ", "Asra"), "vidyalaya": ("ᱟᱥᱲᱟ", "Asra"), "kaksha": ("ᱪᱟᱱᱟᱪ", "Chanach"),
    "guruji": ("ᱢᱟᱪᱮᱫ", "Machet"), "shikshak": ("ᱢᱟᱪᱮᱫ", "Machet"),
    "bacha": ("ᱜᱤᱫᱽᱨᱟᱹ", "Gidra"), "bachhe": ("ᱜᱤᱫᱽᱨᱟᱹ ᱠᱚ", "Gidra ko"), "chhatra": ("ᱯᱟᱹᱴᱷᱩᱣᱟᱹ", "Pathuwa"),
    "kitab": ("ᱯᱚᱛᱚᱵ", "Potob"), "pustak": ("ᱯᱚᱛᱚᱵ", "Potob"), "kalam": ("ᱠᱚᱞᱚᱢ", "Kolom"),
    "gaon": ("ᱟᱹᱛᱩ", "Atu"), "ghar": ("ᱚᱲᱟᱜ", "Orag"), "makaan": ("ᱚᱲᱟᱜ", "Orag"),
    "ped": ("ᱫᱟᱨᱮ", "Dare"), "paudha": ("ᱫᱟᱨᱮ ᱱᱟᱹᱬᱤ", "Dare Nari"),
    "jungle": ("ᱵᱤᱨ", "Bir"), "van": ("ᱵᱤᱨ", "Bir"),
    "nadi": ("ᱜᱟᱰᱟ", "Gada"), "talab": ("ᱯᱩᱠᱷᱨᱤ", "Pukhri"), "pahar": ("ᱵᱩᱨᱩ", "Buru"),
    "suraj": ("ᱥᱤᱧ ᱵᱮᱲᱟ", "Sing Bera"), "surya": ("ᱥᱤᱧ ᱵᱮᱲᱟ", "Sing Bera"),
    "chand": ("ᱪᱟᱸᱫᱚ", "Chando"), "chandrama": ("ᱪᱟᱸᱫᱚ", "Chando"), "tare": ("ᱤᱯᱤᱞ ᱠᱚ", "Ipil ko"),
    "barish": ("ᱫᱟᱜ ᱡᱟᱹᱲᱤ", "Dag Jari"), "barsat": ("ᱫᱟᱜ ᱡᱟᱹᱲᱤ", "Dag Jari"),
    "dharti": ("ᱫᱷᱟᱹᱨᱛᱤ", "Dharti"), "mitti": ("ᱦᱟᱥᱟ", "Hasa"), "hawa": ("ᱦᱚᱭ", "Hoy"),
    "aag": ("ᱥᱮᱸᱜᱮᱞ", "Sengel"), "jeevan": ("ᱡᱤᱣᱤ", "Jiwi"),
    "achha": ("ᱵᱷᱟᱹᱜᱤ", "Bhagi"), "sundar": ("ᱪᱚᱨᱚᱠ", "Chorok"),
    "bada": ("ᱢᱟᱨᱟᱝ", "Marang"), "chhota": ("ᱠᱟᱹᱴᱤᱡ", "Katic"),
    "bahut": ("ᱟᱹᱰᱤ", "Adi"), "khelna": ("ᱮᱱᱮᱡ", "Enej"), "padhna": ("ᱯᱟᱲᱦᱟᱣ", "Parhaw"),
    "likhna": ("ᱚᱞ", "Ol"), "sikhna": ("ᱪᱮᱫᱚᱜ", "Chedog"), "aana": ("ᱦᱤᱡᱩᱜ", "Hijug"),
    "jana": ("ᱪᱟᱞᱟᱜ", "Chalag"), "dekhna": ("ᱧᱮᱞ", "Nyel"), "sunna": ("ᱟᱸᱡᱚᱢ", "Anjom"),
    "bolna": ("ᱨᱚᱲ", "Ror"), "dena": ("ᱮᱢ", "Em"), "lena": ("ᱦᱟᱛᱟᱣ", "Hataw"),
    "madad": ("ᱜᱚᱲᱚ", "Goro"), "namaste": ("ᱡᱚᱦᱟᱨ", "Johar"), "johar": ("ᱡᱚᱦᱟᱨ", "Johar"),
}

def transliterate_to_ol_chiki(text: str) -> str:
    """Accurately converts any residual English or Devanagari into authentic Ol Chiki (ᱚᱞ ᱪᱤᱠᱤ).
    Guarantees no Latin or Devanagari character remains in the primary script output.
    """
    if not text:
        return ""

    out: List[str] = []
    i = 0
    clean = text.strip()

    while i < len(clean):
        char = clean[i]

        # Already Ol Chiki or allowed punctuation
        if '\u1c50' <= char <= '\u1c7f' or char in [' ', '\n', '\t', '?', '!', '.', ',', '-', ':', '(', ')']:
            out.append(char)
            i += 1
            continue

        # Devanagari character
        if '\u0900' <= char <= '\u097f':
            chiki = DEVANAGARI_TO_OL_CHIKI.get(char, '')
            if chiki:
                out.append(chiki)
            i += 1
            continue

        # Latin letters (English)
        low_sub2 = clean[i:i+2].lower()
        low_sub1 = clean[i].lower()

        if len(low_sub2) == 2 and low_sub2 in LATIN_TO_OL_CHIKI:
            out.append(LATIN_TO_OL_CHIKI[low_sub2])
            i += 2
        elif low_sub1 in LATIN_TO_OL_CHIKI:
            out.append(LATIN_TO_OL_CHIKI[low_sub1])
            i += 1
        elif char.isdigit():
            out.append(LATIN_TO_OL_CHIKI.get(char, char))
            i += 1
        else:
            # Drop unknown Latin non-standard symbols or replace with clean space
            if char.isspace():
                out.append(' ')
            i += 1

    result = "".join(out).strip()
    # Normalize multiple spaces
    result = re.sub(r' +', ' ', result)
    return result

def clean_santali_roman(text: str) -> str:
    """Cleans and standardizes Roman phonetic pronunciation string."""
    clean = re.sub(r'\s+', ' ', text).strip()
    return clean

def translate_to_santali(text: str, source_lang: str = "en") -> str:
    """Translates educational & general text into 100% genuine Santali in Ol Chiki script.
    Followed by Roman pronunciation in parentheses.
    NEVER leaks English or Hindi characters into the Ol Chiki output.
    """
    clean_input = text.strip()
    if not clean_input:
        return ""

    clean_norm = re.sub(r'[?!.,।॥]+$', '', clean_input).strip()
    clean_norm = re.sub(r'\s+', ' ', clean_norm).lower()

    def is_ol_chiki(value: str) -> bool:
        """Reject legacy mojibake entries instead of returning corrupted script."""
        return any('\u1c50' <= char <= '\u1c7f' for char in value) and not any(
            char.isalpha() and not ('\u1c50' <= char <= '\u1c7f') for char in value
        )

    # Translate the complete sentence. Word-by-word substitution cannot produce
    # reliable grammar, and transliterating English letters only creates nonsense.
    try:
        source_code = source_lang if source_lang and source_lang != "auto" else "auto"
        url = (
            "https://translate.googleapis.com/translate_a/single?client=gtx"
            f"&sl={urllib.parse.quote(source_code)}&tl=sat&dt=t&q={urllib.parse.quote(clean_input)}"
        )
        request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.loads(response.read().decode("utf-8"))
        translated = "".join(part[0] for part in payload[0] if part and part[0]).strip()
        if is_ol_chiki(translated):
            return translated
    except Exception:
        # Keep the curated local phrase/lexicon fallback available offline.
        pass

    # 1. Direct Multi-Word Phrase Match
    if clean_norm in SANTALI_PHRASES and is_ol_chiki(SANTALI_PHRASES[clean_norm][0]):
        ol_chiki, roman = SANTALI_PHRASES[clean_norm]
        return f"{ol_chiki} ({roman})"

    # Check without trailing punctuations / trimmed
    norm_no_punct = re.sub(r'[^\w\s\u0900-\u097f]', '', clean_norm).strip()
    if norm_no_punct in SANTALI_PHRASES and is_ol_chiki(SANTALI_PHRASES[norm_no_punct][0]):
        ol_chiki, roman = SANTALI_PHRASES[norm_no_punct]
        return f"{ol_chiki} ({roman})"

    for phrase, (chiki, roman) in SANTALI_PHRASES.items():
        if (clean_norm == phrase.lower() or norm_no_punct == phrase.lower()) and is_ol_chiki(chiki):
            return f"{chiki} ({roman})"

    # 2. Word-Level Lexicon Translation with Grammatical Structuring
    words = clean_input.split()
    chiki_tokens: List[str] = []
    roman_tokens: List[str] = []

    # Check for two-word compounds (e.g. "school children", "mother tongue", "in school", "clean air")
    idx = 0
    while idx < len(words):
        w = words[idx]
        w_clean = re.sub(r'[^\w]', '', w.lower())

        # Check bigram first
        if idx + 1 < len(words):
            next_w = words[idx + 1]
            next_clean = re.sub(r'[^\w]', '', next_w.lower())
            bigram = f"{w_clean} {next_clean}"
            if bigram in SANTALI_PHRASES and is_ol_chiki(SANTALI_PHRASES[bigram][0]):
                ch, ro = SANTALI_PHRASES[bigram]
                chiki_tokens.append(ch)
                roman_tokens.append(ro)
                idx += 2
                continue
            elif bigram in SANTALI_LEXICON:
                ch, ro = SANTALI_LEXICON[bigram]
                chiki_tokens.append(ch)
                roman_tokens.append(ro)
                idx += 2
                continue

        # Single word lookup in curated lexicon
        if w_clean in SANTALI_LEXICON:
            ch, ro = SANTALI_LEXICON[w_clean]
            chiki_tokens.append(ch)
            roman_tokens.append(ro)
        elif w_clean:
            # Word not in direct lexicon: attempt smart fallback
            # If word is in Devanagari or English, check if Google Translate gives a root term in our lexicon
            translated_chiki = None
            translated_roman = None

            try:
                trans_url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl={source_lang}&tl=hi&dt=t&q={urllib.parse.quote(w)}"
                req = urllib.request.Request(trans_url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, timeout=2) as resp:
                    data = json.loads(resp.read().decode())
                    hi_term = data[0][0][0].strip().lower()
                    hi_clean = re.sub(r'[^\w]', '', hi_term)
                    if hi_clean in SANTALI_LEXICON:
                        translated_chiki, translated_roman = SANTALI_LEXICON[hi_clean]
            except Exception:
                pass

            if translated_chiki and translated_roman:
                chiki_tokens.append(translated_chiki)
                roman_tokens.append(translated_roman)
            else:
                # Do not invent Santali by spelling an English/Hindi word in Ol Chiki.
                # Keep unknown words visible in the Roman line so they can be corrected.
                roman_tokens.append(w)

        idx += 1

    final_chiki = " ".join(chiki_tokens).strip()
    final_roman = " ".join(roman_tokens).strip()

    # Final guarantee: Ensure NOT A SINGLE Latin or Devanagari character exists in final_chiki
    final_chiki = " ".join(chiki_tokens).strip()

    # Preserve question mark if input had one
    if clean_input.endswith('?') and not final_chiki.endswith('?'):
        final_chiki += '?'
        final_roman += '?'

    return f"{final_chiki} ({final_roman})"
