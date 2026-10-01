"""Builds input-test.nes: an NROM test cartridge that plays a steady 440 Hz
tone and reads all four NES controllers every frame (Four Score protocol on
$4016/$4017, bit 0 or bit 1 so the Famicom 4-player adapter also works),
drawing each player's 8 buttons as a row of solid/empty tiles. End-to-end tests decode player input
straight from the rendered pixels, so they observe what the emulated game
actually receives rather than what we think we sent.

Two always-solid calibration tiles sit at (col 11, row 8) and (col 20, row 18);
the bounding box of all lit pixels is therefore exactly tile columns 11-20 and
rows 8-18, whatever buttons are held.

Layout: player N's row is tile row 10+2N (N=0..3), columns 12-19, in read
order A, B, Select, Start, Up, Down, Left, Right. Solid tile = pressed.

Run: python3 make-input-test-rom.py  (writes input-test.nes next to it)
"""
import os

OPS = {  # mnemonic, mode -> opcode
    ('sei', 'imp'): 0x78, ('cld', 'imp'): 0xD8, ('txs', 'imp'): 0x9A, ('inx', 'imp'): 0xE8,
    ('dex', 'imp'): 0xCA, ('dey', 'imp'): 0x88, ('rts', 'imp'): 0x60, ('pha', 'imp'): 0x48,
    ('pla', 'imp'): 0x68, ('asl', 'imp'): 0x0A, ('rti', 'imp'): 0x40,
    ('lda', 'imm'): 0xA9, ('ldx', 'imm'): 0xA2, ('ldy', 'imm'): 0xA0, ('adc', 'imm'): 0x69,
    ('and', 'imm'): 0x29, ('cmp', 'imm'): 0xC9,
    ('lda', 'abs'): 0xAD, ('sta', 'abs'): 0x8D, ('stx', 'abs'): 0x8E, ('bit', 'abs'): 0x2C,
    ('jsr', 'abs'): 0x20, ('jmp', 'abs'): 0x4C,
    ('lda', 'zp'): 0xA5, ('sta', 'zp'): 0x85, ('rol', 'zp'): 0x26,
    ('bpl', 'rel'): 0x10, ('bne', 'rel'): 0xD0,
}
SIZE = {'imp': 1, 'imm': 2, 'zp': 2, 'rel': 2, 'abs': 3}

def assemble(program, origin):
    labels, pc = {}, origin
    for item in program:
        if isinstance(item, str):
            labels[item] = pc
        else:
            pc += SIZE[item[1]]
    out, pc = bytearray(), origin
    for item in program:
        if isinstance(item, str):
            continue
        op, mode, *arg = item
        out.append(OPS[(op, mode)])
        val = arg[0] if arg else None
        if isinstance(val, str):
            val = labels[val]
        if mode in ('imm', 'zp'):
            out.append(val & 0xFF)
        elif mode == 'abs':
            out += bytes([val & 0xFF, val >> 8])
        elif mode == 'rel':
            off = val - (pc + 2)
            assert -128 <= off <= 127, (op, off)
            out.append(off & 0xFF)
        pc += SIZE[mode]
    return bytes(out), labels

def read_port(port, zp):
    # 8 serial reads; bit0|bit1 -> carry -> rotate into zp byte (A ends in bit 7)
    lbl = f'read_{port:x}_{zp}'
    return [('ldx', 'imm', 8), lbl, ('lda', 'abs', port), ('and', 'imm', 3), ('cmp', 'imm', 1),
            ('rol', 'zp', zp), ('dex', 'imp'), ('bne', 'rel', lbl)]

def draw_row(player):
    addr = 0x2000 + (10 + 2 * player) * 32 + 12
    return [('lda', 'imm', addr >> 8), ('sta', 'abs', 0x2006), ('lda', 'imm', addr & 0xFF),
            ('sta', 'abs', 0x2006), ('lda', 'zp', player), ('jsr', 'abs', 'writebits')]

def set_tile(row, col):
    addr = 0x2000 + row * 32 + col
    return [('lda', 'imm', addr >> 8), ('sta', 'abs', 0x2006), ('lda', 'imm', addr & 0xFF),
            ('sta', 'abs', 0x2006), ('lda', 'imm', 1), ('sta', 'abs', 0x2007)]

wait_vblank = lambda n: [f'vb{n}', ('bit', 'abs', 0x2002), ('bpl', 'rel', f'vb{n}')]

program = [
    'reset', ('sei', 'imp'), ('cld', 'imp'), ('ldx', 'imm', 0x40), ('stx', 'abs', 0x4017),
    ('ldx', 'imm', 0xFF), ('txs', 'imp'), ('inx', 'imp'), ('stx', 'abs', 0x2000),
    ('stx', 'abs', 0x2001), ('stx', 'abs', 0x4010),
    *wait_vblank(1), *wait_vblank(2),
    # continuous ~440 Hz square wave on pulse 1, so tests can check the guest
    # really receives the host's audio: 50% duty, length counter halted,
    # constant volume 15, sweep off, period 253 (1.79 MHz / (16 * 254) ≈ 440 Hz)
    ('lda', 'imm', 0x01), ('sta', 'abs', 0x4015),
    ('lda', 'imm', 0xBF), ('sta', 'abs', 0x4000),
    ('lda', 'imm', 0x00), ('sta', 'abs', 0x4001),
    ('lda', 'imm', 0xFD), ('sta', 'abs', 0x4002),
    ('lda', 'imm', 0x00), ('sta', 'abs', 0x4003),
    # palette: backdrop black, colour 1 white
    ('lda', 'imm', 0x3F), ('sta', 'abs', 0x2006), ('lda', 'imm', 0x00), ('sta', 'abs', 0x2006),
    ('lda', 'imm', 0x0F), ('sta', 'abs', 0x2007), ('lda', 'imm', 0x30), ('sta', 'abs', 0x2007),
    # clear nametable 0 (1 KiB of tile 0)
    ('lda', 'imm', 0x20), ('sta', 'abs', 0x2006), ('lda', 'imm', 0x00), ('sta', 'abs', 0x2006),
    ('ldy', 'imm', 4), ('ldx', 'imm', 0), ('lda', 'imm', 0),
    'clear', ('sta', 'abs', 0x2007), ('inx', 'imp'), ('bne', 'rel', 'clear'), ('dey', 'imp'), ('bne', 'rel', 'clear'),
    # calibration markers: solid tiles at (col 11,row 8) and (col 20,row 18) bound the
    # button grid, so a test can map NES tile coordinates onto whatever size/letterbox
    # RetroArch renders at.
    *set_tile(8, 11), *set_tile(18, 20),
    ('lda', 'imm', 0), ('sta', 'abs', 0x2005), ('sta', 'abs', 0x2005),
    ('lda', 'imm', 0b00001010), ('sta', 'abs', 0x2001),
    'main', *wait_vblank(3),
    ('lda', 'imm', 1), ('sta', 'abs', 0x4016), ('lda', 'imm', 0), ('sta', 'abs', 0x4016),
    *read_port(0x4016, 0), *read_port(0x4016, 2),   # P1, then P3 (Four Score)
    *read_port(0x4017, 1), *read_port(0x4017, 3),   # P2, then P4
    *draw_row(0), *draw_row(1), *draw_row(2), *draw_row(3),
    ('lda', 'imm', 0), ('sta', 'abs', 0x2000), ('sta', 'abs', 0x2005), ('sta', 'abs', 0x2005),
    ('jmp', 'abs', 'main'),
    'writebits', ('ldx', 'imm', 8),
    'wb', ('asl', 'imp'), ('pha', 'imp'), ('lda', 'imm', 0), ('adc', 'imm', 0), ('sta', 'abs', 0x2007),
    ('pla', 'imp'), ('dex', 'imp'), ('bne', 'rel', 'wb'), ('rts', 'imp'),
    'nmi', ('rti', 'imp'),
]

code, labels = assemble(program, 0xC000)
prg = bytearray(code.ljust(0x4000 - 6, b'\xEA'))
for vec in ('nmi', 'reset', 'nmi'):  # NMI, RESET, IRQ
    prg += bytes([labels[vec] & 0xFF, labels[vec] >> 8])
chr_rom = bytearray(0x2000)
chr_rom[16:24] = b'\xFF' * 8  # tile 1, plane 0 solid -> colour 1
header = b'NES\x1A' + bytes([1, 1, 0, 0]) + bytes(8)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'input-test.nes')
open(out, 'wb').write(header + prg + chr_rom)
print(f'wrote {out}: {len(header + prg + chr_rom)} bytes, code {len(code)} bytes')
