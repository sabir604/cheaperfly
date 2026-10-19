import { it,expect,vi } from "vitest";
import { API_VERSION,accountPreferenceDefaults } from "@cheaperfly/api-contracts";
import { proxyWebsiteApi } from "@/server/api-transport";
const env={NODE_ENV:"production" as const,CHEAPERFLY_BACKEND_URL:"http://127.0.0.1:3201"};
const envelope=(data:unknown,pagination?:unknown)=>({data,meta:{apiVersion:API_VERSION,providerMode:"simulated",requestId:"test"},...(pagination?{pagination}:{})});
it("forwards only validated collection pagination and requires valid pagination metadata",async()=>{
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json(envelope([],{page:2,perPage:20,total:0,totalPages:0})));
 const result=await proxyWebsiteApi(new Request("https://website.test/api/customer/v1/travellers?page=2&perPage=20"),"customer",["travellers"],{env,fetch:fetcher});
 expect(result.status).toBe(200);expect(fetcher.mock.calls[0][0]).toBe("http://127.0.0.1:3201/api/website/v1/customer/travellers?page=2&perPage=20");
 expect((await result.json()).pagination.page).toBe(2);
 for(const query of ["customerId=bob","perPage=101","page=1&page=2"]){
  expect((await proxyWebsiteApi(new Request(`https://website.test/api/customer/v1/travellers?${query}`),"customer",["travellers"],{env,fetch:fetcher})).status).toBe(400);
 }
 const missing=await proxyWebsiteApi(new Request("https://website.test/api/customer/v1/travellers"),"customer",["travellers"],{env,fetch:vi.fn().mockResolvedValue(Response.json(envelope([])))});
 expect(missing.status).toBe(502);
});
it("rejects unexpected account fields and external notification links before returning data",async()=>{
 for(const [path,data]of [["preferences",{...accountPreferenceDefaults,token:"private"}],["notifications",[{id:"n",kind:"support",title:"Update",body:"Message",at:"2026-10-16T00:00:00Z",read:false,href:"https://evil.test"}]]] as const){
  const response=await proxyWebsiteApi(new Request(`https://website.test/api/customer/v1/${path}`),"customer",[path],{env,fetch:vi.fn().mockResolvedValue(Response.json(envelope(data,{page:1,perPage:100,total:1,totalPages:1})))});
  expect(response.status).toBe(502);expect(JSON.stringify(await response.json())).not.toContain("private");
 }
});
