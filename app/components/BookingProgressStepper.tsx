"use client";

interface BookingProgressStepperProps {
  currentStep: 1 | 2 | 3 | 4;
  locale?: string;
}

export default function BookingProgressStepper({
  currentStep,
  locale = "en",
}: BookingProgressStepperProps) {
  const isThai = locale === "th";
  const isChinese = locale === "zh";

  const steps = [
    {
      step: 1,
      name: isThai ? "เลือกทัวร์และวันที่" : isChinese ? "选择旅游与日期" : "Tour & Date",
    },
    {
      step: 2,
      name: isThai ? "ข้อมูลผู้เดินทาง" : isChinese ? "旅客信息" : "Guest Details",
    },
    {
      step: 3,
      name: isThai ? "ยืนยันการจอง" : isChinese ? "预订确认" : "Confirmation",
    },
    {
      step: 4,
      name: isThai ? "ชำระเงิน" : isChinese ? "付款" : "Payment",
    },
  ];

  return (
    <div className="w-full py-4 mb-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between relative">
          {/* Connector Line behind steps */}
          <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-0.5 bg-[#D6CEBD] -z-0">
            <div
              className="h-full bg-[#B89450] transition-all duration-300"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>

          {steps.map((item) => {
            const isCompleted = item.step < currentStep;
            const isCurrent = item.step === currentStep;

            return (
              <div
                key={item.step}
                className="relative z-10 flex flex-col items-center group"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm ${
                    isCompleted
                      ? "bg-[#B89450] text-white ring-4 ring-[#B89450]/20"
                      : isCurrent
                      ? "bg-[#282722] text-[#D1B16A] ring-4 ring-[#B89450]/30 border-2 border-[#B89450]"
                      : "bg-white text-gray-400 border-2 border-[#D6CEBD]"
                  }`}
                >
                  {isCompleted ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    item.step
                  )}
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-medium transition-colors ${
                      isCurrent
                        ? "font-bold text-[#282722]"
                        : isCompleted
                        ? "text-[#B89450]"
                        : "text-gray-400"
                    }`}
                  >
                    {item.name}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

