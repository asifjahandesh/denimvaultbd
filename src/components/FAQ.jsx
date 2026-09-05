import React, { useState } from 'react'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { translations } from '../utils/translations'

export default function FAQ({ lang = 'bn' }) {
  const t = translations[lang]

  const bnFaqs = [
    {
      question: 'কীভাবে অর্ডার করব?',
      answer: 'খুবই সহজ! আপনার পছন্দের পণ্যটির নিচে থাকা "এখনই অর্ডার করুন" বাটনে ক্লিক করুন। তারপর আপনার নাম, মোবাইল নাম্বার এবং সম্পূর্ণ ঠিকানা দিয়ে অর্ডার কনফার্ম বাটনে ক্লিক করলেই আপনার অর্ডারটি সম্পন্ন হয়ে যাবে।',
    },
    {
      question: 'ডেলিভারি পেতে কত দিন সময় লাগবে?',
      answer: 'ঢাকার ভিতরে সাধারণত ২৪ থেকে ৪৮ ঘণ্টার মধ্যে ডেলিভারি দেওয়া হয়। ঢাকার বাইরে ৩ থেকে ৫ কার্যদিবসের মধ্যে আপনার ঠিকানায় পণ্য পৌঁছে যাবে।',
    },
    {
      question: 'ডেলিভারি চার্জ কত?',
      answer: 'ঢাকার ভিতরে ডেলিভারি চার্জ ৬০ টাকা এবং ঢাকার বাইরে ডেলিভারি চার্জ ১২০ টাকা। আপনার অর্ডারের ঠিকানার উপর ভিত্তি করে এটি স্বয়ংক্রিয়ভাবে হিসাব করা হয়।',
    },
    {
      question: 'অর্ডার করার জন্য কি আগে পেমেন্ট করতে হবে?',
      answer: 'না, কোনো অগ্রিম পেমেন্টের প্রয়োজন নেই। আমাদের রয়েছে ক্যাশ অন ডেলিভারি সুবিধা, অর্থাৎ ডেলিভারি ম্যানের কাছ থেকে প্রোডাক্ট বুঝে পেয়ে চেক করে তারপর টাকা পরিশোধ করতে পারবেন।',
    },
    {
      question: 'প্রোডাক্টে কোনো সমস্যা থাকলে কি পরিবর্তন করা যাবে?',
      answer: 'অবশ্যই! আমাদের প্রোডাক্টের কোয়ালিটি নিয়ে আমরা শতভাগ আত্মবিশ্বাসী। তবুও যদি কোনো ডিফেক্ট বা সমস্যা থাকে, তবে ডেলিভারি নেওয়ার সময় চেক করে সরাসরি ডেলিভারি ম্যানের কাছে ফেরত দিতে পারবেন অথবা ২৪ ঘণ্টার মধ্যে আমাদের সাথে যোগাযোগ করলে আমরা সেটি পরিবর্তন বা ফেরত নিব।',
    },
  ]

  const enFaqs = [
    {
      question: 'How do I place an order?',
      answer: 'It is very simple! Click the "View Details & Order" button on your preferred product. Fill in your Name, Phone Number, and Address in the checkout form, then click confirm to place the order.',
    },
    {
      question: 'How long will delivery take?',
      answer: 'Inside Dhaka, delivery usually takes 24 to 48 hours. Outside Dhaka, it takes 3 to 5 business days to reach your address.',
    },
    {
      question: 'What are the delivery charges?',
      answer: 'Delivery charge inside Dhaka is 60 BDT and outside Dhaka is 120 BDT. This is calculated automatically based on your shipping address.',
    },
    {
      question: 'Do I need to pay in advance to order?',
      answer: 'No, advance payment is not required. We offer Cash on Delivery (COD) service, meaning you pay the delivery agent only after receiving and checking the product.',
    },
    {
      question: 'Can I return the product if there is an issue?',
      answer: 'Absolutely! We are 100% confident in our product quality. However, if there is any defect or issue, you can inspect it in front of the delivery agent and return it immediately, or contact us within 24 hours for a replacement/return.',
    },
  ]

  const faqs = lang === 'bn' ? bnFaqs : enFaqs

  const [activeIndex, setActiveIndex] = useState(null)

  const toggleFAQ = (index) => {
    setActiveIndex(activeIndex === index ? null : index)
  }

  return (
    <section id="faq" class="bg-white py-16 md:py-24">
      <div class="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div class="text-center">
          <h2 class="text-2xl font-extrabold text-slate-900 md:text-3xl lg:text-4xl">
            {lang === 'bn' ? (
              <>সাধারণ কিছু <span class="text-rose-500">জিজ্ঞাসা (FAQ)</span></>
            ) : (
              <>Frequently Asked <span class="text-rose-500">Questions (FAQ)</span></>
            )}
          </h2>
          <p class="mx-auto mt-3 max-w-xl text-xs text-slate-500 md:text-sm">
            {t.faqSub}
          </p>
        </div>

        {/* Accordions */}
        <div class="mt-12 space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeIndex === idx
            return (
              <div
                key={idx}
                class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-premium transition-all"
              >
                <button
                  onClick={() => toggleFAQ(idx)}
                  class="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-slate-50/50"
                >
                  <div class="flex items-center gap-3 pr-4">
                    <HelpCircle size={18} className={`${isOpen ? 'text-rose-500' : 'text-slate-400'} flex-shrink-0`} />
                    <span class="text-xs font-bold text-slate-800 md:text-sm">{faq.question}</span>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-rose-500' : ''}`}
                  />
                </button>
                <div
                  class={`transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-40 border-t border-slate-50 p-5' : 'max-h-0'
                  } overflow-hidden bg-slate-50/40 text-xs md:text-sm leading-relaxed text-slate-600`}
                >
                  {faq.answer}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
