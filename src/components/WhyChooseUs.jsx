import React from 'react'
import { Award, ShieldCheck, HeartHandshake, Truck } from 'lucide-react'
import { translations } from '../utils/translations'

export default function WhyChooseUs({ lang = 'bn' }) {
  const t = translations[lang]

  const features = [
    {
      icon: <Truck size={28} />,
      title: lang === 'bn' ? 'ক্যাশ অন ডেলিভারি' : 'Cash on Delivery',
      description: lang === 'bn' 
        ? 'সারাদেশে হোম ডেলিভারি দেওয়া হয়। প্রোডাক্ট হাতে পেয়ে দেখে তারপর পেমেন্ট করুন।'
        : 'Home delivery all over Bangladesh. Inspect the product first and then pay.',
      bgColor: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    },
    {
      icon: <Award size={28} />,
      title: lang === 'bn' ? 'সর্বোত্তম কোয়ালিটি' : 'Premium Quality',
      description: lang === 'bn'
        ? 'আমরা সরাসরি বিশ্বস্ত সোর্স থেকে প্রিমিয়াম কোয়ালিটির পণ্য সংগ্রহ করে গ্রাহকদের সরবরাহ করি।'
        : 'We collect premium quality products directly from trusted sources and supply to our clients.',
      bgColor: 'bg-rose-50 text-rose-600 border-rose-100',
    },
    {
      icon: <HeartHandshake size={28} />,
      title: lang === 'bn' ? 'বিশ্বস্ত কাস্টমার সাপোর্ট' : 'Trusted Support',
      description: lang === 'bn'
        ? 'অর্ডারের পূর্ব থেকে শুরু করে ডেলিভারি ও পরবর্তী যে কোনো প্রয়োজনে আমরা কাস্টমার সেবায় নিয়োজিত।'
        : 'Dedicated customer service before ordering, during shipping, and for any queries afterwards.',
      bgColor: 'bg-blue-50 text-blue-600 border-blue-100',
    },
    {
      icon: <ShieldCheck size={28} />,
      title: lang === 'bn' ? 'সহজ রিটার্ন পলিসি' : 'Easy Return Policy',
      description: lang === 'bn'
        ? 'পণ্য পছন্দ না হলে অথবা কোনো ত্রুটি থাকলে ডেলিভারি ম্যানের কাছে সহজেই রিটার্ন করুন।'
        : 'Return items easily with the delivery agent if they do not match or have defects.',
      bgColor: 'bg-purple-50 text-purple-600 border-purple-100',
    },
  ]

  return (
    <section id="why-choose-us" class="bg-white py-16 md:py-24">
      <div class="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div class="text-center">
          <h2 class="text-2xl font-extrabold text-slate-900 md:text-3xl lg:text-4xl">
            {lang === 'bn' ? (
              <>কেন আমাদের থেকে <span class="text-rose-500">পণ্য কিনবেন?</span></>
            ) : (
              <>Why Buy <span class="text-rose-500">From Us?</span></>
            )}
          </h2>
          <p class="mx-auto mt-3 max-w-xl text-xs text-slate-500 md:text-sm">
            {t.whyChooseSub}
          </p>
        </div>

        {/* Features grid */}
        <div class="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => (
            <div
              key={idx}
              class="flex flex-col items-center text-center rounded-3xl border border-slate-100 bg-white p-6 shadow-premium hover-scale transition-all"
            >
              <div class={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 ${feature.bgColor} shadow-inner mb-4`}>
                {feature.icon}
              </div>
              <h3 class="text-base font-bold text-slate-900 md:text-lg">{feature.title}</h3>
              <p class="mt-2.5 text-xs text-slate-500 md:text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
