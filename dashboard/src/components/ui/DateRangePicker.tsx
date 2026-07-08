"use client";

import * as React from "react";
import { addDays, format } from "date-fns";
import { id } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateRange {
  start: string;
  end: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [startDate, setStartDate] = React.useState<Date | undefined>(
    value.start ? new Date(value.start + "T00:00:00") : undefined
  );
  const [endDate, setEndDate] = React.useState<Date | undefined>(
    value.end ? new Date(value.end + "T00:00:00") : undefined
  );

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    const from = range.from;
    const to = range.to || range.from;
    setStartDate(from);
    setEndDate(to);
    if (from && to) {
      onChange({
        start: format(from, "yyyy-MM-dd"),
        end: format(to, "yyyy-MM-dd"),
      });
    }
  };

  const displayValue =
    startDate && endDate
      ? `${format(startDate, "dd MMM", { locale: id })} - ${format(endDate, "dd MMM", { locale: id })}`
      : value.start
        ? `${value.start} — ${value.end}`
        : "";

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            data-empty={!displayValue}
            className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground gap-2 min-w-[180px]"
          />
        }
      >
        <CalendarIcon className="size-3.5 shrink-0" />
        {displayValue || "Filter tanggal"}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from: startDate, to: endDate }}
          onSelect={handleSelect}
          locale={id}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  );
}
