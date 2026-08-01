"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Upload, ChevronDown } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: "Do you offer fully remote positions?",
    answer:
      "Yes, many of our roles are fully remote. Remote eligibility is listed on each individual job posting.",
  },
  {
    question: "How long does the hiring process take?",
    answer:
      "Most processes take two to four weeks from application to offer, depending on the role and scheduling availability.",
  },
  {
    question: "Can I apply if my background is not a perfect match?",
    answer:
      "Yes. We encourage you to apply even if you do not meet every requirement listed in the job description.",
  },
  {
    question: "How is candidate data handled?",
    answer:
      "Candidate data is processed in accordance with our Candidate Privacy Notice and retained for a defined period only.",
  },
  {
    question: "Do you work with external recruiting agencies?",
    answer:
      "We work with a small number of vetted agency partners on select roles. Unsolicited agency submissions are not accepted.",
  },
  {
    question: "What accessibility accommodations are available?",
    answer:
      "We provide reasonable accommodations throughout the hiring process. Contact recruiting@zoikovertex.com to make a request.",
  },
];

export default function TalentNetworkPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [agreed, setAgreed] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    location: "",
    roleInterest: "",
    portfolioUrl: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  };

  const toggleFaq = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 px-6 py-16 sm:py-24">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 lg:grid-cols-[1fr_1fr]">
        {/* Left Card - Form */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="rounded-3xl border border-slate-200/70 bg-white p-10 shadow-sm"
        >
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-slate-900 sm:text-[28px]">
            Don&apos;t see the right role yet?
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
            Join the talent network. Tell us what you can help build. We review
            the network when roles open.
          </p>

          <form className="mt-8 flex flex-col gap-6">
            {/* First / Last name */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="firstName"
                  className="text-[14px] font-medium text-slate-800"
                >
                  First name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="Alex"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="lastName"
                  className="text-[14px] font-medium text-slate-800"
                >
                  Last name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Johnson"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-[14px] font-medium text-slate-800"
              >
                Work or personal email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="alex@example.com"
                value={formData.email}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* Location / Role interest */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="location"
                  className="text-[14px] font-medium text-slate-800"
                >
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  placeholder="City, Country"
                  value={formData.location}
                  onChange={handleChange}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="roleInterest"
                  className="text-[14px] font-medium text-slate-800"
                >
                  Role interest
                </label>
                <div className="relative">
                  <select
                    id="roleInterest"
                    name="roleInterest"
                    value={formData.roleInterest}
                    onChange={handleChange}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
                  >
                    <option value="">Select area</option>
                    <option value="engineering">Engineering</option>
                    <option value="design">Design</option>
                    <option value="product">Product</option>
                    <option value="sales">Sales</option>
                    <option value="operations">Operations</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>

            {/* Portfolio URL */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="portfolioUrl"
                className="text-[14px] font-medium text-slate-800"
              >
                LinkedIn, GitHub, or portfolio URL
              </label>
              <input
                id="portfolioUrl"
                name="portfolioUrl"
                type="text"
                placeholder="https://"
                value={formData.portfolioUrl}
                onChange={handleChange}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-700 placeholder:text-slate-400 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </div>

            {/* Resume upload */}
            <div className="flex flex-col gap-2">
              <label className="text-[14px] font-medium text-slate-800">
                Resume / CV{" "}
                <span className="font-mono text-[12px] font-normal text-slate-400">
                  optional — PDF, max 5MB
                </span>
              </label>
              <label
                htmlFor="resume"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-[15px] text-slate-500">
                  {fileName ? fileName : "Drag and drop or click to upload"}
                </span>
                <input
                  id="resume"
                  name="resume"
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Consent checkbox */}
            <label
              htmlFor="consent"
              className="flex cursor-pointer items-start gap-3"
            >
              <input
                id="consent"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-slate-900 accent-slate-900"
              />
              <span className="text-[14px] leading-relaxed text-slate-500">
                I agree that ZoikoVertex may process and store my personal data
                for recruiting purposes in line with the{" "}
                <a
                  href="#"
                  className="font-medium text-slate-700 underline underline-offset-2"
                >
                  Candidate Privacy Notice
                </a>
                . I understand I can request deletion at any time. Data will be
                retained for up to 24 months or until I withdraw consent.
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-[#161f4d] px-6 py-4 text-[15px] font-semibold text-white transition hover:bg-[#1c2860]"
            >
              <Send className="h-4 w-4" />
              Join talent network
            </button>

            {/* Footer note */}
            <p className="mt-1 text-center font-mono text-[12px] leading-relaxed text-slate-400">
              ZoikoVertex is an equal opportunity employer. We provide
              reasonable accommodations where required by applicable law.{" "}
              <a href="#" className="underline underline-offset-2">
                Candidate Privacy Notice
              </a>{" "}
              ·{" "}
              <a href="#" className="underline underline-offset-2">
                EEO Statement
              </a>{" "}
              ·{" "}
              <a href="#" className="underline underline-offset-2">
                Accessibility
              </a>
            </p>
          </form>
        </motion.div>

        {/* Right Column - FAQ */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
          className="flex flex-col"
        >
          <span className="font-mono text-[12px] font-medium tracking-[0.15em] text-slate-400">
            CANDIDATE FAQ
          </span>

          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
            {faqItems.map((item, index) => (
              <div
                key={item.question}
                className={
                  index !== 0 ? "border-t border-slate-200/70" : undefined
                }
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="flex w-full items-center justify-between gap-4 px-7 py-6 text-left"
                >
                  <span className="text-[16px] font-bold text-slate-900">
                    {item.question}
                  </span>
                  <motion.span
                    animate={{ rotate: openIndex === index ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="shrink-0"
                  >
                    <ChevronDown className="h-5 w-5 text-slate-500" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {openIndex === index && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-7 pb-6 text-[14px] leading-relaxed text-slate-500">
                        {item.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
            className="mt-6 rounded-3xl border border-slate-200/70 bg-white p-7 shadow-sm"
          >
            <p className="font-mono text-[13px] leading-relaxed text-slate-500">
              ZoikoVertex is an equal opportunity employer and does not
              discriminate on the basis of race, color, religion, sex, national
              origin, age, disability, veteran status, or any other protected
              status under applicable law. Reasonable accommodations are
              available upon request. All candidate data is handled in
              accordance with our{" "}
              <a
                href="#"
                className="underline underline-offset-2 text-slate-600"
              >
                Candidate Privacy Notice
              </a>
              . Candidate applications are not retained indefinitely — we apply
              defined retention periods as described in our privacy
              documentation. Contact{" "}
              <a
                href="#"
                className="underline underline-offset-2 text-slate-600"
              >
                recruiting@zoikovertex.com
              </a>{" "}
              for accessibility accommodations or data requests.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
