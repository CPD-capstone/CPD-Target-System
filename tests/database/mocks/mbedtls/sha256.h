// AI-generated (Codex): portable host implementation of the ESP32 SHA-256 API for database tests.
#pragma once
#include <cstddef>
#include <cstdint>
#include <cstring>
struct mbedtls_sha256_context { uint32_t state[8]; uint64_t bytes; unsigned char block[64]; size_t used; };
inline uint32_t hostShaRotate(uint32_t value,unsigned n) { return (value>>n)|(value<<(32-n)); }
inline void hostShaBlock(mbedtls_sha256_context* c,const unsigned char* input) {
    static const uint32_t k[]={
        0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
        0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
        0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
        0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
        0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
        0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
        0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
        0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2};
    uint32_t w[64];
    for(unsigned n=0;n<16;n++) w[n]=(uint32_t(input[4*n])<<24)|(uint32_t(input[4*n+1])<<16)|(uint32_t(input[4*n+2])<<8)|input[4*n+3];
    for(unsigned n=16;n<64;n++) {
        const auto a=w[n-15],b=w[n-2];
        w[n]=w[n-16]+(hostShaRotate(a,7)^hostShaRotate(a,18)^(a>>3))+w[n-7]+(hostShaRotate(b,17)^hostShaRotate(b,19)^(b>>10));
    }
    uint32_t a=c->state[0],b=c->state[1],d=c->state[3],e=c->state[4],f=c->state[5],g=c->state[6],h=c->state[7],v=c->state[2];
    for(unsigned n=0;n<64;n++) {
        const auto t1=h+(hostShaRotate(e,6)^hostShaRotate(e,11)^hostShaRotate(e,25))+((e&f)^(~e&g))+k[n]+w[n];
        const auto t2=(hostShaRotate(a,2)^hostShaRotate(a,13)^hostShaRotate(a,22))+((a&b)^(a&v)^(b&v));
        h=g;g=f;f=e;e=d+t1;d=v;v=b;b=a;a=t1+t2;
    }
    c->state[0]+=a;c->state[1]+=b;c->state[2]+=v;c->state[3]+=d;c->state[4]+=e;c->state[5]+=f;c->state[6]+=g;c->state[7]+=h;
}
inline void mbedtls_sha256_init(mbedtls_sha256_context* c) { std::memset(c,0,sizeof(*c)); }
inline void mbedtls_sha256_free(mbedtls_sha256_context* c) { std::memset(c,0,sizeof(*c)); }
inline int mbedtls_sha256_starts_ret(mbedtls_sha256_context* c,int is224) {
    if(is224) return -1;
    const uint32_t initial[]={0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19};
    std::memcpy(c->state,initial,sizeof(initial));c->used=0;c->bytes=0;return 0;
}
inline int mbedtls_sha256_update_ret(mbedtls_sha256_context* c,const unsigned char* input,size_t count) {
    c->bytes+=count;
    while(count) { const size_t n=64-c->used<count?64-c->used:count;std::memcpy(c->block+c->used,input,n);c->used+=n;input+=n;count-=n;
        if(c->used==64) { hostShaBlock(c,c->block);c->used=0; } }
    return 0;
}
inline int mbedtls_sha256_finish_ret(mbedtls_sha256_context* c,unsigned char output[32]) {
    const uint64_t bits=c->bytes*8;
    c->block[c->used++]=0x80;
    if(c->used>56) { while(c->used<64)c->block[c->used++]=0;hostShaBlock(c,c->block);c->used=0; }
    while(c->used<56)c->block[c->used++]=0;
    for(unsigned n=0;n<8;n++)c->block[56+n]=(unsigned char)(bits>>(56-8*n));hostShaBlock(c,c->block);
    for(unsigned n=0;n<8;n++)for(unsigned b=0;b<4;b++)output[4*n+b]=(unsigned char)(c->state[n]>>(24-8*b));
    return 0;
}
