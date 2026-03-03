import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";

const ChartContainer = ({
  title,
  subtitle,
  children,
  className = "",
  actions,
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center space-x-2">{actions}</div>
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default ChartContainer;
