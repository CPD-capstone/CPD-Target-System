#include <Arduino.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <WiFi.h>
#include <ESPAsyncWebServer.h>

//replace with actual network info
const char* ssid = "SSID";
const char* password = "PASSWORD";

//Handles the relays
//TaskHandle_t is a type that references a task when working with FreeRTOS
TaskHandle_t RelayTaskHandle;

//Queue for passing GPIO pin triggers between cores
//QueueHandle_t is a type that references a queue when working with FreeRTOS
QueueHandle_t relayQueue;

struct RelayCommand{
    int pin;
    int durationMs;
};

//This creates an AsyncWebServer object on port 80
AsyncWebServer server(80);

//This function is for activating the relays in a sequential order, it may need to be changed later
//The parameter isn't technically being used but FreeRTOS expects it to be there 
void RelayTask(void * pvParameters){
    RelayCommand cmd;
    //FreeRTOS tasks are typically infinite loops
    for (;;) {
        //This if basically means execute if we successfully receive a relay command from the queue
        //We pass the queue, where to put the command, and how long to wait
        //The portMAX_DELAY should keep the task blocked until it recieves a command, hopefully keeping us from wasting CPU
        if (xQueueReceive(relayQueue, &cmd, portMAX_DELAY) == pdTRUE){
            pinMode(cmd.pin, OUTPUT);
            //This line activates the relay
            digitalWrite(cmd.pin, HIGH);
            //This line will make it wait for a specified amount of time
            vTaskDelay(pdMS_TO_TICKS(cmd.durationMs));
            //Deactive the relay
            digitalWrite(cmd.pin, LOW);
        }
    }
}

void setup() {
    Serial.begin(115200);

    //The first parameter is the length of the queue, just using 10 as a placeholder for now
    relayQueue = xQueueCreate(10, sizeof(RelayCommand));

    //Will put pin inits right here

    if (!LittleFS.begin(true)){
        Serial.println("LittleFS mount failed");
        return;

    }

    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi..");
  }

    // Print ESP Local IP Address
    Serial.println(WiFi.localIP());


}

void loop(){

}