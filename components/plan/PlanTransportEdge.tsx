"use client";

import { useState } from "react";
import { IconGlyph } from "@/components/icons/IconGlyph";
import {
  transportOptionInstructions,
  transportOptionLabel,
  type PlanTransportConnectionOption,
} from "@/lib/plan/transportConnections";
import type { PlanDaybookConnector } from "@/lib/plan/daybookPath";

const CONFIRM_CURRENT_TRANSPORT_NOTE = "Confirm current transportation day-of.";

function TransportInstructionCopy({
  lines,
  disclosure,
}: {
  lines: string[];
  disclosure?: string;
}) {
  return (
    <span className="plan-path-connector__instructions">
      {lines.map((line) => (
        <small key={line}>{line}</small>
      ))}
      {disclosure && (
        <small className="plan-path-connector__disclosure">
          <em>* {disclosure}</em>
        </small>
      )}
    </span>
  );
}

function TransportOptionCopy({ option }: { option: PlanTransportConnectionOption }) {
  const instructions = transportOptionInstructions(option);
  return (
    <>
      <strong>{transportOptionLabel(option)}</strong>
      <TransportInstructionCopy
        lines={instructions.lines}
        disclosure={instructions.disclosure}
      />
    </>
  );
}

export function PlanTransportEdge({
  connector,
}: {
  connector: PlanDaybookConnector;
}) {
  const [expanded, setExpanded] = useState(false);
  const secondaryOptions = connector.transportOptions?.slice(1) ?? [];

  return (
    <li
      className={`plan-path-connector plan-path-connector--${connector.tone} plan-path-connector--${connector.severity}`}
      aria-label={connector.ariaLabel}
    >
      <span className="plan-path-connector__icon" aria-hidden>
        <IconGlyph iconKey={connector.iconKey} decorative />
      </span>
      <span className="plan-path-connector__copy">
        <strong>{connector.label}</strong>
        {connector.originResortName && connector.destinationResortName && (
          <small>
            {connector.originResortName} to {connector.destinationResortName}
          </small>
        )}
        {connector.detailLines ? (
          <TransportInstructionCopy
            lines={connector.detailLines}
            disclosure={connector.disclosure}
          />
        ) : (
          <small>{connector.detail || CONFIRM_CURRENT_TRANSPORT_NOTE}</small>
        )}
        {secondaryOptions.length > 0 && (
          <>
            <button
              type="button"
              className="plan-path-connector__toggle"
              onClick={() => setExpanded((current) => !current)}
              aria-expanded={expanded}
            >
              {expanded
                ? "Hide other routes"
                : `Show ${secondaryOptions.length} more ${
                    secondaryOptions.length === 1 ? "route" : "routes"
                  }`}
            </button>
            {expanded && (
              <ul className="plan-path-connector__options">
                {secondaryOptions.map((option) => (
                  <li key={option.id}>
                    <TransportOptionCopy option={option} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </span>
    </li>
  );
}
