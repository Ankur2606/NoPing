
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ServiceConnectionProps {
  name: string;
  connected: boolean;
  messages?: number;
}

const services = [
  { name: "Gmail", connected: true, messages: 24 },
  { name: "Slack", connected: true, messages: 18 },
  { name: "Microsoft Teams", connected: false },
  { name: "Asana", connected: false },
];

export function ServiceStatus() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Services</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    service.connected ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  )}
                />
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {service.connected ? (
                  <>
                    <span className="text-xs text-muted-foreground">
                      {service.messages} messages
                    </span>
                    <div className="rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600">
                      Connected
                    </div>
                  </>
                ) : (
                  <div className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                    Not Connected
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
