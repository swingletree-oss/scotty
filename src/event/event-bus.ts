import { Events, log } from "@swingletree-oss/harness";
import { EventEmitter } from "events";
import { injectable } from "inversify";

@injectable()
class EventBus {
  private readonly eventBus: EventEmitter;

  constructor() {
    this.eventBus = new EventEmitter();
  }

  /** Emits an Event to the Event Bus.
   *
   *  Registered event handlers will pick up and process the event.
   */
  public async emit(event: Events.SwingletreeEvent) {
    log.debug("app event %s emitted", event.getEventType());

    this.eventBus.emit(event.getEventType(), event);
  }

  /** Registers an event handler on the Event Bus.
   *
   * @param eventType Event type to listen to
   * @param handler handler function to execute
   * @param context context of the handler function
   */
  public register(eventType: string, handler: Function, context: object) {
    log.debug("%s registered a handler for %s ", context.constructor.name, eventType);
    this.eventBus.on(eventType, this.handlerWrapper(handler, context, eventType));
  }

  private handlerWrapper(handler: Function, context: any, eventName: string): any {
    return (...args: any[]) => {
      try {
        handler.apply(context, args);
      } catch (err) {
        log.error("a handler for event %s encountered an error: %s", eventName, err);
      }
    };
  }
}

export default EventBus;