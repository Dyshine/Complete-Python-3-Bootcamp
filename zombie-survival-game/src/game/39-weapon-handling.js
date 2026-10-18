/* ================= WEAPON HANDLING: aim pose, recoil, reloads, swaps, melee arcs, muzzle flash, feedback =================
   Arm bones are steered toward target directions in the character's frame (x = their left, y = up, z = forward), blended over
   whatever clip is playing, so the gun is shouldered and pointed down the sights instead of dangling at the hip. */
const WA={aim:0,kick:0,swap:0,bloom:0,fov:0,camRec:0,throwT:0,magT:-1,chop:0,reachT:0,heat:0,drift:0,yawOff:0,yawRec:0};
