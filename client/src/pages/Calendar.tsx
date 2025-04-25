
import { Calendar as CalendarIcon } from "lucide-react";
import { ComingSoonPage } from "@/components/shared/ComingSoonPage";

const Calendar = () => {
  return (
    <ComingSoonPage
      title="Calendar Coming Soon"
      description="The time-balanced scheduling calendar is under development. Soon you'll be able to intelligently manage your time with our smart scheduling algorithms."
      icon={<CalendarIcon className="w-8 h-8 text-muted-foreground" />}
    />
  );
};

export default Calendar;
