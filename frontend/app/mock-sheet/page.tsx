"use client";

import { useState } from "react";
import { StudentSideNav } from "@/components/layout/student-side-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockAssessmentSheet } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Languages, FileText, Printer } from "lucide-react";

export default function MockSheetPage() {
  const [showOlChiki, setShowOlChiki] = useState(true);
  const [activeConcept, setActiveConcept] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          body {
            min-width: 0 !important;
          }

          /* Hide navigation and buttons */
          .no-print {
            display: none !important;
          }

          /* Printable page */
          .print-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Two-column A4 layout */
          .print-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 8mm !important;
            width: 100% !important;
          }

          /* Keep cards from splitting */
          .print-column {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
            border-color: #d1d5db !important;
          }

          /* Print card spacing */
          .print-card-content {
            padding: 4mm !important;
          }

          /* Print typography */
          .print-heading {
            font-size: 16pt !important;
            line-height: 1.2 !important;
          }

          .print-subheading {
            font-size: 9pt !important;
          }

          .print-question {
            font-size: 11pt !important;
            line-height: 1.45 !important;
          }

          .print-example {
            font-size: 8.5pt !important;
            line-height: 1.35 !important;
          }

          /* Remove hover/ring effects while printing */
          .print-card:hover {
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="min-h-screen md:flex">
        {/* Sidebar */}
        <div className="no-print">
          <StudentSideNav />
        </div>

        <main
          className={cn(
            "print-page flex-1 min-w-0 max-w-6xl mx-auto",
            "px-4 md:px-6 py-8 pb-24 md:pb-8",
            "space-y-6"
          )}
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="print-heading font-display text-3xl font-bold text-ink">
                {mockAssessmentSheet.title}
              </h1>

              <p className="print-subheading text-ink/55 mt-1">
                Compare the original worksheet with its Santhali version.
              </p>
            </div>

            {/* Script selector */}
            <div className="no-print flex items-center gap-2">
              <span className="text-sm font-semibold text-ink/50">
                Santhali script:
              </span>

              <button
                type="button"
                onClick={() => setShowOlChiki((current) => !current)}
                className="flex items-center gap-2 rounded-full border-2 border-ink/10 bg-white px-4 py-1.5 text-sm font-semibold text-ink/70 hover:border-ink/25"
              >
                <Languages className="w-4 h-4" />

                {showOlChiki ? "Ol Chiki" : "Roman"}
              </button>
            </div>
          </div>

          {/* Printable content */}
          <div className="print-grid grid md:grid-cols-2 gap-5">
            {/* Original */}
            <div className="print-column space-y-4">
              <div className="flex items-center gap-2 text-ink/50 font-semibold text-sm">
                <FileText className="w-4 h-4" />

                <span>
                  Original ({mockAssessmentSheet.originalLanguage})
                </span>
              </div>

              {mockAssessmentSheet.items.map((item, index) => (
                <Card
                  key={item.id}
                  onMouseEnter={() => setActiveConcept(item.concept)}
                  onMouseLeave={() => setActiveConcept(null)}
                  className={cn(
                    "print-card transition-colors",
                    activeConcept === item.concept &&
                      "border-amber ring-2 ring-amber/30"
                  )}
                >
                  <CardContent className="print-card-content p-5 space-y-2">
                    <p className="text-xs font-semibold text-ink/35">
                      Q{index + 1}
                    </p>

                    <p className="print-question font-display text-lg text-ink">
                      {item.original}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Santhali translation */}
            <div className="print-column space-y-4">
              <div className="flex items-center gap-2 text-emerald-dark font-semibold text-sm">
                <Languages className="w-4 h-4" />

                <span>Santhali version + local examples</span>
              </div>

              {mockAssessmentSheet.items.map((item, index) => (
                <Card
                  key={item.id}
                  onMouseEnter={() => setActiveConcept(item.concept)}
                  onMouseLeave={() => setActiveConcept(null)}
                  className={cn(
                    "print-card bg-emerald-light/60 border-emerald/15 transition-colors",
                    activeConcept === item.concept &&
                      "border-amber ring-2 ring-amber/30"
                  )}
                >
                  <CardContent className="print-card-content p-5 space-y-3">
                    {/* Question number + concept */}
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-emerald-dark/60">
                        Q{index + 1}
                      </p>

                      <Badge tone="amber">{item.concept}</Badge>
                    </div>

                    {/* Translation */}
                    <p
                      className={cn(
                        "print-question text-lg text-ink",
                        showOlChiki && "olchiki text-xl"
                      )}
                    >
                      {showOlChiki
                        ? item.translatedOlChiki
                        : item.translated}
                    </p>

                    {/* Local example */}
                    <p className="print-example text-sm text-ink/60 italic border-t border-emerald/15 pt-2">
                      {item.localExample}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="no-print flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handlePrint}
            >
              <Printer className="w-5 h-5 mr-2" />
              Print Mock Sheet
            </Button>

            <Button type="button" variant="primary" size="lg">
              Submit answers
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
